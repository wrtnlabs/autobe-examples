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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformVotingTransactionAtSummaryTransformer } from "../transformers/CommunityPlatformVotingTransactionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminVotingTransactions(props: {
  admin: AdminPayload;
  body: ICommunityPlatformVotingTransaction.IRequest;
}): Promise<IPageICommunityPlatformVotingTransaction.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause with proper null/undefined handling
  const whereInput: Prisma.community_platform_voting_transactionsWhereInput =
    {};
  // User ID filter (exact match)
  if (props.body.user_id !== null && props.body.user_id !== undefined) {
    whereInput.user_id = props.body.user_id;
  }
  // Operation type filter (exact match)
  if (
    props.body.operation_type !== null &&
    props.body.operation_type !== undefined
  ) {
    whereInput.operation_type = props.body.operation_type;
  }
  // Vote type filter (exact match)
  if (props.body.vote_type !== null && props.body.vote_type !== undefined) {
    whereInput.vote_type = props.body.vote_type;
  }
  // Karma impact filter (exact match)
  if (
    props.body.karma_impact !== null &&
    props.body.karma_impact !== undefined
  ) {
    whereInput.karma_impact = props.body.karma_impact;
  }
  // Date range filtering (support partial ranges)
  const startDate =
    props.body.start_date !== null && props.body.start_date !== undefined
      ? new Date(props.body.start_date)
      : null;
  const endDate =
    props.body.end_date !== null && props.body.end_date !== undefined
      ? new Date(props.body.end_date)
      : null;
  if (startDate !== null || endDate !== null) {
    whereInput.transaction_timestamp = {};
    if (startDate !== null) {
      whereInput.transaction_timestamp.gte = startDate;
    }
    if (endDate !== null) {
      whereInput.transaction_timestamp.lte = endDate;
    }
  }
  // Fetch paginated data with transformer selection
  const data =
    await MyGlobal.prisma.community_platform_voting_transactions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { transaction_timestamp: "desc" as const },
      ...CommunityPlatformVotingTransactionAtSummaryTransformer.select(),
    });
  // Get total count for pagination
  const total =
    await MyGlobal.prisma.community_platform_voting_transactions.count({
      where: whereInput,
    });
  // Transform results using the transformer
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
