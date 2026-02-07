import { ICommunityCommentVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVoteSummary";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityCommentVoteSummaryTransformer {
  export type Payload = Prisma.community_comment_vote_summariesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        total_upvotes: true,
        total_downvotes: true,
        net_score: true,
        comment: true,
      },
    } satisfies Prisma.community_comment_vote_summariesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityCommentVoteSummary> {
    return {
      total_upvotes: input.total_upvotes,
      total_downvotes: input.total_downvotes,
      net_score: input.net_score,
    };
  }
}
