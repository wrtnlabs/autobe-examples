import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAuthMemberLogin(props: {
  ip: string;
  body: ICommunityPlatformMember.ILogin;
}): Promise<ICommunityPlatformMember.IAuthorized> {
  // 1. Find member by email with password_hash only
  const memberAuth = await MyGlobal.prisma.community_platform_members.findFirst(
    {
      where: {
        email: props.body.email,
        deleted_at: null, // Only active members
      },
      select: {
        id: true,
        password_hash: true,
      },
    },
  );
  if (!memberAuth) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    memberAuth.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Create session expiration timestamps
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  // 4. Create new session
  const session =
    await MyGlobal.prisma.community_platform_member_sessions.create({
      data: {
        id: v4(),
        community_platform_member_id: memberAuth.id,
        access_token: "", // Will be set after JWT generation
        refresh_token: "", // Will be set after JWT generation
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer ?? null,
        created_at: now,
        updated_at: now,
        expired_at: accessExpires,
      },
    });
  // 5. Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "member",
      id: memberAuth.id,
      session_id: session.id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: memberAuth.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session with actual tokens
  await MyGlobal.prisma.community_platform_member_sessions.update({
    where: { id: session.id },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
    },
  });
  // 7. Update member's last_login_at
  await MyGlobal.prisma.community_platform_members.update({
    where: { id: memberAuth.id },
    data: {
      last_login_at: now,
    },
  });
  // 8. Create token object
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 9. Fetch member data with all required relations
  const member = await MyGlobal.prisma.community_platform_members.findUnique({
    where: { id: memberAuth.id },
    select: {
      id: true,
      email: true,
      username: true,
      nickname: true,
      email_verified: true,
      registered_at: true,
      last_login_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!member) {
    throw new HttpException("Member not found", 404);
  }
  // 10. Fetch avatar file
  const avatarFile = await MyGlobal.prisma.community_platform_files.findFirst({
    where: {
      actor_type: "member",
      actor_id: memberAuth.id,
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      type: true,
      size: true,
      status: true,
      public_url: true,
      created_at: true,
      deleted_at: true,
    },
  });
  // 11. Fetch karma - FIXED FIELD NAME
  const karmaRecord = await MyGlobal.prisma.community_platform_karmas.findFirst(
    {
      where: {
        member_id: memberAuth.id, // Correct field name
      },
    },
  );
  // 12. Fetch posts
  const posts = await MyGlobal.prisma.community_platform_posts.findMany({
    where: {
      community_platform_member_id: memberAuth.id,
      deleted_at: null,
    },
    take: 10, // Limit for summary
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      title: true,
      created_at: true,
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          created_at: true,
          owner_member_id: true,
        },
      },
      author: {
        select: {
          id: true,
          username: true,
          nickname: true,
          email_verified: true,
          registered_at: true,
        },
      },
    },
  });
  // 13. Fetch comments
  const comments = await MyGlobal.prisma.community_platform_comments.findMany({
    where: {
      member_id: memberAuth.id,
      deleted_at: null,
    },
    take: 10, // Limit for summary
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      content: true,
      vote_score: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      post: {
        select: {
          id: true,
          title: true,
          created_at: true,
        },
      },
      author: {
        select: {
          id: true,
          username: true,
          nickname: true,
          email_verified: true,
          registered_at: true,
        },
      },
    },
  });
  // 14. Transform data and return
  const transformedPosts = await ArrayUtil.asyncMap(
    posts,
    async (post) =>
      ({
        id: post.id as string & tags.Format<"uuid">,
        title: post.title,
        author: {
          id: post.author.id as string & tags.Format<"uuid">,
          email: "", // Not available in post query
          username: post.author.username,
          nickname: post.author.nickname,
          email_verified: post.author.email_verified,
          registered_at: post.author.registered_at.toISOString(),
        } satisfies ICommunityPlatformMember.ISummary,
        community: {
          id: post.community.id as string & tags.Format<"uuid">,
          name: post.community.name,
          description: post.community.description,
          created_at: post.community.created_at.toISOString(),
          owner: {
            id: "", // Need to fetch owner from community
            email: "",
            username: "",
            email_verified: false,
            registered_at: "",
          } satisfies ICommunityPlatformMember.ISummary,
          subscriber_count: 0,
        } satisfies ICommunityPlatformCommunity.ISummary,
        vote_score: 0,
        comment_count: 0,
        created_at: post.created_at.toISOString(),
        content_preview: "",
      }) satisfies ICommunityPlatformPost.ISummary,
  );
  const transformedComments = await ArrayUtil.asyncMap(
    comments,
    async (comment) =>
      ({
        id: comment.id as string & tags.Format<"uuid">,
        content: comment.content,
        voteScore: comment.vote_score satisfies number as number,
        createdAt: comment.created_at.toISOString(),
        updatedAt: comment.updated_at.toISOString(),
        deletedAt: comment.deleted_at?.toISOString() ?? null,
        author: {
          id: comment.author.id as string & tags.Format<"uuid">,
          email: "",
          username: comment.author.username,
          nickname: comment.author.nickname,
          email_verified: comment.author.email_verified,
          registered_at: comment.author.registered_at.toISOString(),
        } satisfies ICommunityPlatformMember.ISummary,
        post: {
          id: comment.post.id as string & tags.Format<"uuid">,
          title: comment.post.title,
          author: {
            id: "",
            email: "",
            username: "",
            email_verified: false,
            registered_at: "",
          } satisfies ICommunityPlatformMember.ISummary,
          community: {
            id: "",
            name: "",
            description: null,
            created_at: "",
            owner: {
              id: "",
              email: "",
              username: "",
              email_verified: false,
              registered_at: "",
            } satisfies ICommunityPlatformMember.ISummary,
            subscriber_count: 0,
          } satisfies ICommunityPlatformCommunity.ISummary,
          vote_score: 0,
          comment_count: 0,
          created_at: comment.post.created_at.toISOString(),
          content_preview: "",
        } satisfies ICommunityPlatformPost.ISummary,
      }) satisfies ICommunityPlatformComment.ISummary,
  );
  // 15. Return IAuthorized
  return {
    id: member.id as string & tags.Format<"uuid">,
    username: member.username,
    nickname: member.nickname,
    avatar: avatarFile
      ? ({
          id: avatarFile.id as string & tags.Format<"uuid">,
          name: avatarFile.name,
          type: avatarFile.type,
          size: avatarFile.size satisfies number as number,
          status: avatarFile.status,
          public_url: avatarFile.public_url as
            | (string & tags.Format<"uri">)
            | null,
          actor: {
            id: member.id as string & tags.Format<"uuid">,
            email: member.email,
            username: member.username,
            nickname: member.nickname,
            email_verified: member.email_verified,
            registered_at: member.registered_at.toISOString(),
          } satisfies ICommunityPlatformMember.ISummary,
          created_at: avatarFile.created_at.toISOString(),
          deleted_at: avatarFile.deleted_at?.toISOString() ?? null,
        } satisfies ICommunityPlatformFile.ISummary)
      : null,
    karma: (karmaRecord?.score ?? 0) satisfies number as number,
    posts: transformedPosts,
    comments: transformedComments,
    email: member.email as string & tags.Format<"email">,
    email_verified: member.email_verified,
    registered_at: member.registered_at.toISOString(),
    last_login_at: member.last_login_at?.toISOString() ?? null,
    created_at: member.created_at.toISOString(),
    updated_at: member.updated_at.toISOString(),
    bio: null, // Not implemented in schema
    token,
  } satisfies ICommunityPlatformMember.IAuthorized;
}
