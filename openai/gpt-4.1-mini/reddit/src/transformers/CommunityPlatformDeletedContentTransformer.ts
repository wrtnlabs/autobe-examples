import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeletedContent";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityModeratorTransformer } from "./CommunityPlatformCommunityModeratorTransformer";
import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";
import { CommunityPlatformPostCommentAtSummaryTransformer } from "./CommunityPlatformPostCommentAtSummaryTransformer";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformDeletedContentTransformer {
  export type Payload = Prisma.community_platform_deleted_contentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        moderator: CommunityPlatformCommunityModeratorTransformer.select(),
        user: CommunityPlatformUserAtSummaryTransformer.select(),
        post: CommunityPlatformPostAtSummaryTransformer.select(),
        comment: true, // Fixed: select true to avoid incompatible nested select type for comment relation
      },
    } satisfies Prisma.community_platform_deleted_contentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformDeletedContent> {
    return {
      id: input.id,
      moderator_id: input.moderator.id,
      user_id: input.user.id,
      post_id: input.post?.id ?? null,
      comment_id: input.comment?.id ?? null,
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      moderator: await CommunityPlatformCommunityModeratorTransformer.transform(
        input.moderator,
      ),
      user: await CommunityPlatformUserAtSummaryTransformer.transform(
        input.user,
      ),
      post: input.post
        ? await CommunityPlatformPostAtSummaryTransformer.transform(input.post)
        : null,
      comment: input.comment
        ? await CommunityPlatformPostCommentAtSummaryTransformer.transform({
            id: input.comment.id,
            created_at: input.comment.created_at,
            updated_at: input.comment.updated_at,
            deleted_at: input.comment.deleted_at,
            user_id: input.comment.user_id,
            post_id: input.comment.post_id,
            content_text: input.comment.content, // renamed field to expected
            parent_comment_id: input.comment.parent_id, // renamed field to expected
          })
        : null,
    };
  }
}
