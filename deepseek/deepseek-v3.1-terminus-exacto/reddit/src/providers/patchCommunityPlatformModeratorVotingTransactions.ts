import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformVotingTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingTransaction";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformVotingTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVotingTransaction";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformVotingTransactionAtSummaryTransformer } from "../transformers/CommunityPlatformVotingTransactionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorVotingTransactions(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformVotingTransaction.IRequest;
}): Promise<IPageICommunityPlatformVotingTransaction.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause from filters with proper date handling
  const whereInput: Prisma.community_platform_voting_transactionsWhereInput = {
    ...(props.body.user_id && { user_id: props.body.user_id }),
    ...(props.body.operation_type && {
      operation_type: props.body.operation_type,
    }),
    ...(props.body.vote_type && { vote_type: props.body.vote_type }),
    ...(props.body.karma_impact !== undefined &&
      props.body.karma_impact !== null && {
        karma_impact: props.body.karma_impact satisfies number as number,
      }),
  };
  // Handle date range filtering with proper ISO string to DateTime conversion
  if (props.body.start_date || props.body.end_date) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (props.body.start_date) {
      dateFilter.gte = new Date(props.body.start_date);
    }
    if (props.body.end_date) {
      dateFilter.lte = new Date(props.body.end_date);
    }
    whereInput.transaction_timestamp = dateFilter;
  }
  const data =
    await MyGlobal.prisma.community_platform_voting_transactions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { transaction_timestamp: "desc" },
      ...CommunityPlatformVotingTransactionAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.community_platform_voting_transactions.count({
      where: whereInput,
    });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformVotingTransactionAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
