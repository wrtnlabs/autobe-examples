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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminAnalyticsVotingPatterns(props: {
  admin: AdminPayload;
  body: ICommunityPlatformVotingTransaction.IRequest;
}): Promise<IPageICommunityPlatformVotingTransaction> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE condition using string dates only
  const whereInput: Prisma.community_platform_voting_transactionsWhereInput = {
    ...(props.body.user_id && { user_id: props.body.user_id }),
    ...(props.body.operation_type && {
      operation_type: props.body.operation_type,
    }),
    ...(props.body.vote_type && { vote_type: props.body.vote_type }),
    ...(props.body.karma_impact && { karma_impact: props.body.karma_impact }),
    ...(props.body.start_date && {
      transaction_timestamp: {
        gte: typia.assertEquals<string & tags.Format<"date-time">>(
          props.body.start_date,
        ),
      },
    }),
    ...(props.body.end_date && {
      transaction_timestamp: {
        lte: typia.assertEquals<string & tags.Format<"date-time">>(
          props.body.end_date,
        ),
      },
    }),
  };
  // Sequential queries instead of Promise.all
  const data =
    await MyGlobal.prisma.community_platform_voting_transactions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { transaction_timestamp: "desc" },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
            karma: true,
            created_at: true,
          },
        },
      },
    });
  const total =
    await MyGlobal.prisma.community_platform_voting_transactions.count({
      where: whereInput,
    });
  return {
    data: data.map((item) => ({
      id: item.id,
      operation_type: item.operation_type,
      vote_type: item.vote_type,
      previous_vote_type: item.previous_vote_type ?? undefined,
      karma_impact: item.karma_impact,
      transaction_timestamp: item.transaction_timestamp.toISOString(),
      ip_address: item.ip_address ?? undefined,
      user_agent: item.user_agent ?? undefined,
      created_at: item.created_at.toISOString(),
      updated_at: item.updated_at.toISOString(),
      user: {
        id: item.user.id,
        username: item.user.username,
        display_name: item.user.display_name ?? null,
        avatar_url: item.user.avatar_url ? item.user.avatar_url : null,
        karma: item.user.karma,
        created_at: item.user.created_at.toISOString(),
      },
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
