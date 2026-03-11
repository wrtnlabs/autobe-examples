import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformAuthMemberRefresh(props: {
  body: IRedditPlatformMember.IRefresh;
}): Promise<IRedditPlatformMember.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "member";
    created_at: string & tags.Format<"date-time">;
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as any as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Validate session
  const session =
    await MyGlobal.prisma.reddit_platform_member_sessions.findFirst({
      where: {
        id: decoded.session_id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate member not deleted
  const member =
    await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Generate new tokens (SAME session_id)
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 2 * 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const token = {
    access: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "2h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 6. Update session expiration
  await MyGlobal.prisma.reddit_platform_member_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 7. Fetch member profile with relations
  const memberWithRelations =
    await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
      where: { id: decoded.id },
      include: {
        sessions: {
          select: {
            id: true,
            member: {
              select: {
                id: true,
                username: true,
                display_name: true,
                karma_score: true,
                is_active: true,
                created_at: true,
              },
            },
            ip: true,
            href: true,
            referrer: true,
            created_at: true,
            expired_at: true,
          },
        },
        posts: {
          select: {
            id: true,
            title: true,
            post_type: true,
            vote_score: true,
            comment_count: true,
            created_at: true,
            author: {
              select: {
                id: true,
                username: true,
                display_name: true,
                karma_score: true,
                is_active: true,
                created_at: true,
              },
            },
            community: {
              select: {
                id: true,
                name: true,
                subscriber_count: true,
                created_at: true,
                owner: {
                  select: {
                    id: true,
                    username: true,
                    display_name: true,
                    karma_score: true,
                    is_active: true,
                    created_at: true,
                  },
                },
              },
            },
          },
        },
        comments: {
          select: {
            id: true,
            content: true,
            vote_score: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            author: {
              select: {
                id: true,
                username: true,
                display_name: true,
                karma_score: true,
                is_active: true,
                created_at: true,
              },
            },
          },
        },
        memberPostVotes: {
          select: {
            id: true,
            vote_type: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            user: {
              select: {
                id: true,
                username: true,
                display_name: true,
                karma_score: true,
                is_active: true,
                created_at: true,
              },
            },
            post: {
              select: {
                id: true,
                title: true,
                post_type: true,
                vote_score: true,
                comment_count: true,
                created_at: true,
                author: {
                  select: {
                    id: true,
                    username: true,
                    display_name: true,
                    karma_score: true,
                    is_active: true,
                    created_at: true,
                  },
                },
                community: {
                  select: {
                    id: true,
                    name: true,
                    subscriber_count: true,
                    created_at: true,
                    owner: {
                      select: {
                        id: true,
                        username: true,
                        display_name: true,
                        karma_score: true,
                        is_active: true,
                        created_at: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        commentVotes: {
          select: {
            id: true,
            vote_type: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            member: {
              select: {
                id: true,
                username: true,
                display_name: true,
                karma_score: true,
                is_active: true,
                created_at: true,
              },
            },
            comment: {
              select: {
                id: true,
                content: true,
                vote_score: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                author: {
                  select: {
                    id: true,
                    username: true,
                    display_name: true,
                    karma_score: true,
                    is_active: true,
                    created_at: true,
                  },
                },
              },
            },
          },
        },
        reports: {
          select: {
            id: true,
            reported_content_id: true,
            reported_content_type: true,
            reason: true,
            status: true,
            created_at: true,
            updated_at: true,
            reporter: {
              select: {
                id: true,
                username: true,
                display_name: true,
                karma_score: true,
                is_active: true,
                created_at: true,
              },
            },
            community: {
              select: {
                id: true,
                name: true,
                subscriber_count: true,
                created_at: true,
                owner: {
                  select: {
                    id: true,
                    username: true,
                    display_name: true,
                    karma_score: true,
                    is_active: true,
                    created_at: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  // 8. Return authorized response
  return {
    id: member.id,
    username: member.username,
    display_name: member.display_name,
    bio: member.bio ?? null,
    avatar_url: member.avatar_url ?? null,
    karma_score: member.karma_score,
    is_active: member.is_active,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at:
      member.deleted_at === null ? null : toISOStringSafe(member.deleted_at),
    sessions: await ArrayUtil.asyncMap(
      memberWithRelations.sessions,
      async (s) => ({
        id: s.id,
        member: {
          id: s.member.id,
          username: s.member.username,
          display_name: s.member.display_name,
          karma_score: s.member.karma_score,
          is_active: s.member.is_active,
          created_at: toISOStringSafe(s.member.created_at),
        },
        ip: s.ip,
        href: s.href,
        referrer: s.referrer,
        created_at: toISOStringSafe(s.created_at),
        expired_at: toISOStringSafe(s.expired_at),
      }),
    ),
    posts: await ArrayUtil.asyncMap(memberWithRelations.posts, async (p) => ({
      id: p.id,
      title: p.title,
      post_type: typia.assert<"TEXT" | "LINK" | "IMAGE">(p.post_type),
      vote_score: p.vote_score,
      comment_count: p.comment_count,
      author: {
        id: p.author.id,
        username: p.author.username,
        display_name: p.author.display_name,
        karma_score: p.author.karma_score,
        is_active: p.author.is_active,
        created_at: toISOStringSafe(p.author.created_at),
      },
      community: {
        id: p.community.id,
        name: p.community.name,
        subscriber_count: p.community.subscriber_count,
        created_at: toISOStringSafe(p.community.created_at),
        owner: {
          id: p.community.owner.id,
          username: p.community.owner.username,
          display_name: p.community.owner.display_name,
          karma_score: p.community.owner.karma_score,
          is_active: p.community.owner.is_active,
          created_at: toISOStringSafe(p.community.owner.created_at),
        },
      },
      created_at: toISOStringSafe(p.created_at),
    })),
    comments: await ArrayUtil.asyncMap(
      memberWithRelations.comments,
      async (c) => ({
        id: c.id,
        content: c.content,
        vote_score: c.vote_score,
        author: {
          id: c.author.id,
          username: c.author.username,
          display_name: c.author.display_name,
          karma_score: c.author.karma_score,
          is_active: c.author.is_active,
          created_at: toISOStringSafe(c.author.created_at),
        },
        created_at: toISOStringSafe(c.created_at),
        updated_at: toISOStringSafe(c.updated_at),
        deleted_at:
          c.deleted_at === null ? null : toISOStringSafe(c.deleted_at),
      }),
    ),
    postVotes: await ArrayUtil.asyncMap(
      memberWithRelations.memberPostVotes,
      async (v) => ({
        id: v.id,
        vote_type: typia.assert<"UPVOTE" | "DOWNVOTE" | null>(v.vote_type),
        created_at: toISOStringSafe(v.created_at),
        updated_at: toISOStringSafe(v.updated_at),
        deleted_at:
          v.deleted_at === null ? null : toISOStringSafe(v.deleted_at),
        user: {
          id: v.user.id,
          username: v.user.username,
          display_name: v.user.display_name,
          karma_score: v.user.karma_score,
          is_active: v.user.is_active,
          created_at: toISOStringSafe(v.user.created_at),
        },
        post: {
          id: v.post.id,
          title: v.post.title,
          post_type: typia.assert<"TEXT" | "LINK" | "IMAGE">(v.post.post_type),
          vote_score: v.post.vote_score,
          comment_count: v.post.comment_count,
          created_at: toISOStringSafe(v.post.created_at),
          author: {
            id: v.post.author.id,
            username: v.post.author.username,
            display_name: v.post.author.display_name,
            karma_score: v.post.author.karma_score,
            is_active: v.post.author.is_active,
            created_at: toISOStringSafe(v.post.author.created_at),
          },
          community: {
            id: v.post.community.id,
            name: v.post.community.name,
            subscriber_count: v.post.community.subscriber_count,
            created_at: toISOStringSafe(v.post.community.created_at),
            owner: {
              id: v.post.community.owner.id,
              username: v.post.community.owner.username,
              display_name: v.post.community.owner.display_name,
              karma_score: v.post.community.owner.karma_score,
              is_active: v.post.community.owner.is_active,
              created_at: toISOStringSafe(v.post.community.owner.created_at),
            },
          },
        },
      }),
    ),
    commentVotes: await ArrayUtil.asyncMap(
      memberWithRelations.commentVotes,
      async (v) => ({
        id: v.id,
        vote_type: typia.assert<"UPVOTE" | "DOWNVOTE" | null>(v.vote_type),
        created_at: toISOStringSafe(v.created_at),
        updated_at: toISOStringSafe(v.updated_at),
        deleted_at:
          v.deleted_at === null ? null : toISOStringSafe(v.deleted_at),
        member: {
          id: v.member.id,
          username: v.member.username,
          display_name: v.member.display_name,
          karma_score: v.member.karma_score,
          is_active: v.member.is_active,
          created_at: toISOStringSafe(v.member.created_at),
        },
        comment: {
          id: v.comment.id,
          content: v.comment.content,
          vote_score: v.comment.vote_score,
          author: {
            id: v.comment.author.id,
            username: v.comment.author.username,
            display_name: v.comment.author.display_name,
            karma_score: v.comment.author.karma_score,
            is_active: v.comment.author.is_active,
            created_at: toISOStringSafe(v.comment.author.created_at),
          },
          created_at: toISOStringSafe(v.comment.created_at),
          updated_at: toISOStringSafe(v.comment.updated_at),
          deleted_at:
            v.comment.deleted_at === null
              ? null
              : toISOStringSafe(v.comment.deleted_at),
        },
      }),
    ),
    reports: await ArrayUtil.asyncMap(
      memberWithRelations.reports,
      async (r) => ({
        id: r.id,
        reported_content_id: r.reported_content_id,
        reported_content_type: typia.assert<"POST" | "COMMENT">(
          r.reported_content_type,
        ),
        reason: r.reason,
        status: typia.assert<"PENDING" | "RESOLVED" | "DISMISSED">(r.status),
        reporter: {
          id: r.reporter.id,
          username: r.reporter.username,
          display_name: r.reporter.display_name,
          karma_score: r.reporter.karma_score,
          is_active: r.reporter.is_active,
          created_at: toISOStringSafe(r.reporter.created_at),
        },
        community: {
          id: r.community.id,
          name: r.community.name,
          subscriber_count: r.community.subscriber_count,
          created_at: toISOStringSafe(r.community.created_at),
          owner: {
            id: r.community.owner.id,
            username: r.community.owner.username,
            display_name: r.community.owner.display_name,
            karma_score: r.community.owner.karma_score,
            is_active: r.community.owner.is_active,
            created_at: toISOStringSafe(r.community.owner.created_at),
          },
        },
        created_at: toISOStringSafe(r.created_at),
        updated_at: toISOStringSafe(r.updated_at),
      }),
    ),
    access: token.access,
    refresh: token.refresh,
    expired_at: token.expired_at,
    user: {
      id: member.id,
      username: member.username,
      display_name: member.display_name,
      karma_score: member.karma_score,
      is_active: member.is_active,
      created_at: toISOStringSafe(member.created_at),
    },
    token: {
      access: token.access,
      refresh: token.refresh,
      expired_at: token.expired_at,
      refreshable_until: token.refreshable_until,
    },
  };
}
