import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReward } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReward";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminRewardsRewardId(props: {
  admin: AdminPayload;
  rewardId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallReward> {
  // Find the reward program by ID
  const reward = await MyGlobal.prisma.shopping_mall_rewards.findUnique({
    where: {
      id: props.rewardId,
    },
  });

  // Check if reward exists
  if (!reward) {
    throw new HttpException("Reward program not found", 404);
  }

  // Convert Date objects to ISO strings and return
  return {
    id: reward.id,
    name: reward.name,
    description: reward.description,
    reward_type: reward.reward_type,
    earning_rules: reward.earning_rules,
    redemption_rules: reward.redemption_rules,
    coin_value: reward.coin_value,
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
  };
}
