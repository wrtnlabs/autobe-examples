import { ICommunityPlatformPostVoteOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformPostVoteOfUserAtSummaryTransformer {
  export type Payload = Prisma.community_platform_post_vote_of_usersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        vote_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        postVote: { select: { id: true } },
        user: { select: { id: true } },
      },
    } satisfies Prisma.community_platform_post_vote_of_usersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPostVoteOfUser.ISummary> {
    return {
      id: input.id,
      voteType: input.vote_type,
      createdAt: toISOStringSafe(input.created_at) as string &
        import("typia").tags.Format<"date-time">,
      updatedAt: toISOStringSafe(input.updated_at) as string &
        import("typia").tags.Format<"date-time">,
      deletedAt: input.deleted_at
        ? (toISOStringSafe(input.deleted_at) as string &
            import("typia").tags.Format<"date-time">)
        : undefined,
      postVoteId: input.postVote.id,
      userId: input.user.id,
    };
  }
}
