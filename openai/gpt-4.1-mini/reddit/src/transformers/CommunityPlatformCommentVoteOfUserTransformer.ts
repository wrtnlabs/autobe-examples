import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentVoteOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfUser";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommentAtSummaryTransformer } from "./CommunityPlatformCommentAtSummaryTransformer";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformCommentVoteOfUserTransformer {
  export type Payload =
    Prisma.community_platform_comment_vote_of_usersGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        community_platform_comment_id: true,
        community_platform_user_id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        comment: CommunityPlatformCommentAtSummaryTransformer.select(),
        user: CommunityPlatformUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_comment_vote_of_usersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommentVoteOfUser> {
    return {
      id: input.id,
      communityPlatformCommentId: input.community_platform_comment_id,
      communityPlatformUserId: input.community_platform_user_id,
      voteType: input.vote_type,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      comment: input.comment
        ? await CommunityPlatformCommentAtSummaryTransformer.transform(
            input.comment,
          )
        : undefined,
      user: input.user
        ? await CommunityPlatformUserAtSummaryTransformer.transform(input.user)
        : undefined,
    };
  }
}
