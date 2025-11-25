import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReward } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReward";
import { IPageIShoppingMallReward } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReward";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallRewards(props: {
  body: IShoppingMallReward.IRequest;
}): Promise<IPageIShoppingMallReward.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build where condition dynamically
  const where: Prisma.shopping_mall_rewardsWhereInput = {
    deleted_at: null,
  };

  // Text search across name and description
  if (props.body.search) {
    where.OR = [
      { name: { contains: props.body.search, mode: "insensitive" } },
      { description: { contains: props.body.search, mode: "insensitive" } },
    ];
  }

  // Filter by reward type
  if (props.body.reward_type) {
    where.reward_type = props.body.reward_type;
  }

  // Filter by active status
  if (props.body.is_active !== undefined && props.body.is_active !== null) {
    where.is_active = props.body.is_active;
  }

  // Date range filtering for valid_from
  if (props.body.valid_from_start || props.body.valid_from_end) {
    where.valid_from = {};
    if (props.body.valid_from_start) {
      where.valid_from.gte = props.body.valid_from_start;
    }
    if (props.body.valid_from_end) {
      where.valid_from.lte = props.body.valid_from_end;
    }
  }

  // Determine order by field
  let orderBy: Prisma.shopping_mall_rewardsOrderByWithRelationInput = {};
  const orderDirection = props.body.order_direction === "desc" ? "desc" : "asc";

  switch (props.body.order_by) {
    case "valid_from":
      orderBy = { valid_from: orderDirection };
      break;
    case "name":
      orderBy = { name: orderDirection };
      break;
    default:
      orderBy = { created_at: orderDirection };
      break;
  }

  // Execute queries concurrently
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_rewards.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_rewards.count({ where }),
  ]);

  // Convert to API response format
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };

  const responseData: IShoppingMallReward.ISummary[] = data.map((reward) => ({
    id: reward.id as string & tags.Format<"uuid">,
    name: reward.name,
    description: reward.description,
    reward_type: reward.reward_type,
    coin_value: reward.coin_value,
    earning_rules: reward.earning_rules,
    redemption_rules: reward.redemption_rules,
    minimum_purchase: reward.minimum_purchase ?? undefined,
    maximum_coins: reward.maximum_coins ?? undefined,
    valid_from: toISOStringSafe(reward.valid_from),
    valid_until: reward.valid_until
      ? toISOStringSafe(reward.valid_until)
      : undefined,
    is_active: reward.is_active,
    created_at: toISOStringSafe(reward.created_at),
    updated_at: toISOStringSafe(reward.updated_at),
    deleted_at: reward.deleted_at
      ? toISOStringSafe(reward.deleted_at)
      : undefined,
  }));

  return {
    pagination,
    data: responseData,
  };
}
