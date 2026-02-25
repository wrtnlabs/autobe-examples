import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformPostCommentAtSummaryTransformer } from "./CommunityPlatformPostCommentAtSummaryTransformer";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformPostCommentTransformer {
  export type Payload = Prisma.community_platform_post_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        content_text: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post: { select: { id: true } },
        user: CommunityPlatformUserAtSummaryTransformer.select(),
        parentComment: {
          select: {
            id: true,
            content_text: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            user_id: true,
            post_id: true,
            parent_comment_id: true,
          },
        },
        childComments: { select: {} },
      },
    } satisfies Prisma.community_platform_post_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPostComment> {
    return {
      id: input.id,
      content: input.content_text,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt:
        input.deleted_at !== null && input.deleted_at !== undefined
          ? toISOStringSafe(input.deleted_at)
          : null,
      postId: input.post.id,
      author: await CommunityPlatformUserAtSummaryTransformer.transform(
        input.user,
      ),
      parentComment: input.parentComment
        ? await CommunityPlatformPostCommentAtSummaryTransformer.transform(
            input.parentComment,
          )
        : null,
    };
  }
}
