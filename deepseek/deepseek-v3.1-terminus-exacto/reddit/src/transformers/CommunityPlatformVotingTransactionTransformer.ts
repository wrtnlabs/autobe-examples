import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformVotingTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingTransaction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformVotingTransactionTransformer {
  export type Payload = Prisma.community_platform_voting_transactionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        operation_type: true,
        vote_type: true,
        previous_vote_type: true,
        karma_impact: true,
        transaction_timestamp: true,
        ip_address: true,
        user_agent: true,
        created_at: true,
        updated_at: true,
        user: CommunityPlatformUserAtSummaryTransformer.select(),
        postTarget: true,
        commentVotingTransaction: true,
        postVoteTransaction: true,
      },
    } satisfies Prisma.community_platform_voting_transactionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformVotingTransaction> {
    return {
      id: input.id,
      operation_type: input.operation_type,
      vote_type: input.vote_type,
      previous_vote_type: input.previous_vote_type ?? null,
      karma_impact: input.karma_impact,
      transaction_timestamp: input.transaction_timestamp.toISOString(),
      ip_address: input.ip_address ?? null,
      user_agent: input.user_agent ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      user: await CommunityPlatformUserAtSummaryTransformer.transform(
        input.user,
      ),
    };
  }
}
