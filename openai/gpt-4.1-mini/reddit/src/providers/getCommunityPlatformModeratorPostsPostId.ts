import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformPostTransformer } from "../transformers/CommunityPlatformPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformModeratorPostsPostId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPost> {
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        community_id: true,
        author_user_id: true,
        author_moderator_id: true,
        title: true,
        post_type: true,
        authorUser: {
          select: {
            id: true,
            email: true,
            username: true,
            display_name: true,
            bio: true,
            avatar_url: true,
            karma: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        authorModerator: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
            karma: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            icon_url: true,
            subscriberCount: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            ownerUser: {
              select: {
                id: true,
                email: true,
                username: true,
                display_name: true,
                bio: true,
                avatar_url: true,
                karma: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
        postTexts: {
          select: {
            id: true,
            content: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        postImages: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        postLink: {
          select: {
            id: true,
            url: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        comments: {
          select: {
            id: true,
          },
        },
        postVotes: true,
        postComments: true,
        postReports: true,
        reports: true,
        moderationLogs: {
          select: {
            id: true,
          },
        },
        deletionRecords: {
          select: {
            id: true,
          },
        },
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  let content: {
    content?: string;
    url?: string;
    title?: string;
    description?: string;
  } = {};
  switch (post.post_type) {
    case "text":
      content =
        post.postTexts && post.postTexts.length > 0
          ? { content: post.postTexts[0].content }
          : { content: "" };
      break;
    case "image":
      content =
        post.postImages && post.postImages.length > 0
          ? { url: post.postImages[0].url ?? "" }
          : { url: "" };
      break;
    case "link":
      content = post.postLink
        ? {
            url: post.postLink.url ?? "",
            title: undefined,
            description: post.postLink.description ?? "",
          }
        : { url: "", title: "", description: "" };
      break;
  }
  const postTypeLiteral = typia.assert<"text" | "link" | "image">(
    post.post_type,
  );
  const transformed: ICommunityPlatformPost = {
    id: post.id,
    communityId: post.community_id,
    authorUserId: post.author_user_id ?? null,
    authorModeratorId: post.author_moderator_id ?? null,
    title: post.title,
    postType: postTypeLiteral,
    createdAt: toISOStringSafe(post.created_at) as string &
      tags.Format<"date-time">,
    updatedAt: toISOStringSafe(post.updated_at) as string &
      tags.Format<"date-time">,
    deletedAt: post.deleted_at
      ? (toISOStringSafe(post.deleted_at) as string & tags.Format<"date-time">)
      : null,
    community: {
      id: post.community.id,
      name: post.community.name,
      description: post.community.description,
      iconUrl: post.community.icon_url,
      subscriberCount: (post.community.subscriberCount ?? 0) satisfies number &
        tags.Type<"int32">,
      createdAt: toISOStringSafe(post.community.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: toISOStringSafe(post.community.updated_at) as string &
        tags.Format<"date-time">,
      deletedAt: post.community.deleted_at
        ? (toISOStringSafe(post.community.deleted_at) as string &
            tags.Format<"date-time">)
        : null,
      ownerUser: {
        id: post.community.ownerUser.id,
        email: post.community.ownerUser.email,
        username: post.community.ownerUser.username,
        displayName: post.community.ownerUser.display_name,
        bio: post.community.ownerUser.bio ?? undefined,
        avatarUrl: post.community.ownerUser.avatar_url ?? undefined,
        karma: post.community.ownerUser.karma as number & tags.Type<"int32">,
        createdAt: toISOStringSafe(
          post.community.ownerUser.created_at,
        ) as string & tags.Format<"date-time">,
        updatedAt: toISOStringSafe(
          post.community.ownerUser.updated_at,
        ) as string & tags.Format<"date-time">,
        deletedAt: post.community.ownerUser.deleted_at
          ? (toISOStringSafe(post.community.ownerUser.deleted_at) as string &
              tags.Format<"date-time">)
          : null,
      },
    },
    authorUser: post.authorUser
      ? {
          id: post.authorUser.id,
          email: post.authorUser.email,
          username: post.authorUser.username,
          displayName: post.authorUser.display_name,
          bio: post.authorUser.bio ?? undefined,
          avatarUrl: post.authorUser.avatar_url ?? undefined,
          karma: post.authorUser.karma as number & tags.Type<"int32">,
          createdAt: toISOStringSafe(post.authorUser.created_at) as string &
            tags.Format<"date-time">,
          updatedAt: toISOStringSafe(post.authorUser.updated_at) as string &
            tags.Format<"date-time">,
          deletedAt: post.authorUser.deleted_at
            ? (toISOStringSafe(post.authorUser.deleted_at) as string &
                tags.Format<"date-time">)
            : null,
        }
      : null,
    authorModerator: post.authorModerator
      ? {
          id: post.authorModerator.id,
          username: post.authorModerator.username,
          displayName: post.authorModerator.display_name,
          avatarUrl: post.authorModerator.avatar_url ?? undefined,
          karma: post.authorModerator.karma as number & tags.Type<"int32">,
          createdAt: toISOStringSafe(
            post.authorModerator.created_at,
          ) as string & tags.Format<"date-time">,
          updatedAt: toISOStringSafe(
            post.authorModerator.updated_at,
          ) as string & tags.Format<"date-time">,
          deletedAt: post.authorModerator.deleted_at
            ? (toISOStringSafe(post.authorModerator.deleted_at) as string &
                tags.Format<"date-time">)
            : null,
        }
      : null,
    postTexts: post.postTexts
      ? post.postTexts.map(
          (pt: {
            id: string;
            content: string;
            created_at: Date;
            updated_at: Date;
            deleted_at: Date | null;
          }) => ({
            id: pt.id,
            content: pt.content,
            createdAt: toISOStringSafe(pt.created_at) as string &
              tags.Format<"date-time">,
            updatedAt: toISOStringSafe(pt.updated_at) as string &
              tags.Format<"date-time">,
            deletedAt: pt.deleted_at
              ? (toISOStringSafe(pt.deleted_at) as string &
                  tags.Format<"date-time">)
              : null,
          }),
        )
      : [],
    postImages: post.postImages
      ? post.postImages.map(
          (pi: {
            id: string;
            url: string | null;
            created_at: Date;
            updated_at: Date;
            deleted_at: Date | null;
          }) => ({
            id: pi.id,
            url: pi.url ?? "",
            createdAt: toISOStringSafe(pi.created_at) as string &
              tags.Format<"date-time">,
            updatedAt: toISOStringSafe(pi.updated_at) as string &
              tags.Format<"date-time">,
            deletedAt: pi.deleted_at
              ? (toISOStringSafe(pi.deleted_at) as string &
                  tags.Format<"date-time">)
              : null,
          }),
        )
      : [],
    postLink: post.postLink
      ? {
          id: post.postLink.id,
          url: post.postLink.url ?? "",
          title: undefined,
          description: post.postLink.description ?? "",
          createdAt: toISOStringSafe(post.postLink.created_at) as string &
            tags.Format<"date-time">,
          updatedAt: toISOStringSafe(post.postLink.updated_at) as string &
            tags.Format<"date-time">,
          deletedAt: post.postLink.deleted_at
            ? (toISOStringSafe(post.postLink.deleted_at) as string &
                tags.Format<"date-time">)
            : null,
        }
      : null,
    content,
    comments: post.comments ?? [],
    postVotes: post.postVotes ?? [],
    postComments: post.postComments ?? [],
    postReports: post.postReports ?? [],
    reports: post.reports ?? [],
    moderationLogs: post.moderationLogs ?? [],
    deletionRecords: post.deletionRecords ?? [],
  };
  return await CommunityPlatformPostTransformer.transform(transformed);
}
