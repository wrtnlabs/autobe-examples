import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberPostsPostIdLinks(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostLink.ICreate;
}): Promise<ICommunityPlatformPostLink> {
  try {
    const created = await MyGlobal.prisma.$transaction(async (prisma) => {
      const post = await prisma.community_platform_posts.findFirstOrThrow({
        where: {
          id: props.postId,
          deleted_at: null,
        },
        select: {
          id: true,
          title: true,
          post_type: true,
          status: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          community_platform_member_id: true,
          author: {
            select: {
              id: true,
              code: true,
              email: true,
              email_verified: true,
              status: true,
              last_signed_in_at: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          community: {
            select: {
              id: true,
              slug: true,
              title: true,
              description: true,
              status: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              member: {
                select: {
                  id: true,
                  code: true,
                  email: true,
                  email_verified: true,
                  status: true,
                  last_signed_in_at: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
              _count: {
                select: {
                  subscriptions: true,
                },
              },
            },
          },
          _count: {
            select: {
              comments: true,
            },
          },
        },
      });
      if (post.community_platform_member_id !== props.member.id) {
        throw new HttpException("Forbidden", 403);
      }
      if (post.post_type !== "link") {
        throw new HttpException("Post is not a link post", 400);
      }
      const existing = await prisma.community_platform_post_links.findFirst({
        where: {
          community_platform_post_id: props.postId,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
      if (existing !== null) {
        throw new HttpException("Link content already exists", 409);
      }
      const hostname = (() => {
        try {
          return new URL(props.body.target_url).hostname.toLowerCase();
        } catch {
          return props.body.target_url.toLowerCase();
        }
      })();
      const domainDisplay = hostname.startsWith("www.")
        ? hostname.slice(4)
        : hostname;
      const now = new Date();
      const id = v4();
      return await prisma.community_platform_post_links.create({
        data: {
          id,
          target_url: props.body.target_url,
          domain_display: domainDisplay,
          created_at: now,
          updated_at: now,
          deleted_at: null,
          post: {
            connect: {
              id: post.id,
            },
          },
        },
        select: {
          id: true,
          target_url: true,
          domain_display: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          post: {
            select: {
              id: true,
              title: true,
              post_type: true,
              status: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              author: {
                select: {
                  id: true,
                  code: true,
                  email: true,
                  email_verified: true,
                  status: true,
                  last_signed_in_at: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
              community: {
                select: {
                  id: true,
                  slug: true,
                  title: true,
                  description: true,
                  status: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                  member: {
                    select: {
                      id: true,
                      code: true,
                      email: true,
                      email_verified: true,
                      status: true,
                      last_signed_in_at: true,
                      created_at: true,
                      updated_at: true,
                      deleted_at: true,
                    },
                  },
                  _count: {
                    select: {
                      subscriptions: true,
                    },
                  },
                },
              },
              _count: {
                select: {
                  comments: true,
                },
              },
            },
          },
        },
      });
    });
    return {
      id: created.id,
      post: {
        id: created.post.id,
        title: created.post.title,
        post_type: created.post.post_type,
        status: created.post.status,
        author: {
          id: created.post.author.id,
          code: created.post.author.code,
          email: created.post.author.email,
          email_verified: created.post.author.email_verified,
          status: created.post.author.status,
          last_signed_in_at:
            created.post.author.last_signed_in_at !== null
              ? toISOStringSafe(created.post.author.last_signed_in_at)
              : null,
          created_at: toISOStringSafe(created.post.author.created_at),
          updated_at: toISOStringSafe(created.post.author.updated_at),
          deleted_at:
            created.post.author.deleted_at !== null
              ? toISOStringSafe(created.post.author.deleted_at)
              : null,
        } satisfies ICommunityPlatformMember.ISummary,
        community: {
          id: created.post.community.id,
          slug: created.post.community.slug,
          title: created.post.community.title,
          description: created.post.community.description,
          status: created.post.community.status,
          member: {
            id: created.post.community.member.id,
            code: created.post.community.member.code,
            email: created.post.community.member.email,
            email_verified: created.post.community.member.email_verified,
            status: created.post.community.member.status,
            last_signed_in_at:
              created.post.community.member.last_signed_in_at !== null
                ? toISOStringSafe(
                    created.post.community.member.last_signed_in_at,
                  )
                : null,
            created_at: toISOStringSafe(
              created.post.community.member.created_at,
            ),
            updated_at: toISOStringSafe(
              created.post.community.member.updated_at,
            ),
            deleted_at:
              created.post.community.member.deleted_at !== null
                ? toISOStringSafe(created.post.community.member.deleted_at)
                : null,
          } satisfies ICommunityPlatformMember.ISummary,
          subscriber_count: created.post.community._count.subscriptions,
          created_at: toISOStringSafe(created.post.community.created_at),
          updated_at: toISOStringSafe(created.post.community.updated_at),
          deleted_at:
            created.post.community.deleted_at !== null
              ? toISOStringSafe(created.post.community.deleted_at)
              : null,
        } satisfies ICommunityPlatformCommunity.ISummary,
        vote_count: 0,
        comment_count: created.post._count.comments,
        created_at: toISOStringSafe(created.post.created_at),
        updated_at: toISOStringSafe(created.post.updated_at),
        deleted_at:
          created.post.deleted_at !== null
            ? toISOStringSafe(created.post.deleted_at)
            : null,
      } satisfies ICommunityPlatformPost.ISummary,
      target_url: created.target_url,
      domain_display: created.domain_display,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at !== null
          ? toISOStringSafe(created.deleted_at)
          : null,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Link content already exists", 409);
    }
    throw error;
  }
}
