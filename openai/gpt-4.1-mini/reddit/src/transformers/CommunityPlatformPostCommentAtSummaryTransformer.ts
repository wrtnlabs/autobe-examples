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
import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";
import { CommunityPlatformPostCommentAtSummaryTransformer } from "./CommunityPlatformPostCommentAtSummaryTransformer";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformPostCommentAtSummaryTransformer {
  export type Payload = Prisma.community_platform_post_commentsGetPayload<
    ReturnType<typeof select>
  >;
  export function select(): Prisma.community_platform_post_commentsFindManyArgs {
    return {
      select: {
        id: true,
        content_text: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        post: CommunityPlatformPostAtSummaryTransformer.select(),
        user: CommunityPlatformUserAtSummaryTransformer.select(),
        parentComment: {
          select: {
            id: true,
            content_text: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            user: CommunityPlatformUserAtSummaryTransformer.select(),
            post: CommunityPlatformPostAtSummaryTransformer.select(),
            parentComment: false,
          },
        },
        childComments: true,
      },
    } satisfies Prisma.community_platform_post_commentsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPostComment.ISummary> {
    return {
      id: input.id,
      contentText: input.content_text,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
      post: await CommunityPlatformPostAtSummaryTransformer.transform(
        input.post,
      ),
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
