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

export async function postShoppingMallAdminRewards(props: {
  admin: AdminPayload;
  body: IShoppingMallReward.ICreate;
}): Promise<IShoppingMallReward> {
  // Check if reward program name already exists
  const existingReward = await MyGlobal.prisma.shopping_mall_rewards.findFirst({
    where: {
      name: props.body.name,
      deleted_at: null,
    },
  });

  if (existingReward) {
    throw new HttpException(
      "Reward program with this name already exists",
      400,
    );
  }

  const now = toISOStringSafe(new Date());
  const createdReward = await MyGlobal.prisma.shopping_mall_rewards.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      name: props.body.name,
      description: props.body.description,
      reward_type: props.body.reward_type,
      earning_rules: props.body.earning_rules,
      redemption_rules: props.body.redemption_rules,
      coin_value: props.body.coin_value,
      minimum_purchase: props.body.minimum_purchase ?? null,
      maximum_coins: props.body.maximum_coins ?? null,
      valid_from: props.body.valid_from,
      valid_until: props.body.valid_until ?? null,
      is_active: props.body.is_active,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: createdReward.id,
    name: createdReward.name,
    description: createdReward.description,
    reward_type: createdReward.reward_type,
    earning_rules: createdReward.earning_rules,
    redemption_rules: createdReward.redemption_rules,
    coin_value: createdReward.coin_value,
    minimum_purchase:
      createdReward.minimum_purchase === null
        ? undefined
        : createdReward.minimum_purchase,
    maximum_coins:
      createdReward.maximum_coins === null
        ? undefined
        : createdReward.maximum_coins,
    valid_from: toISOStringSafe(createdReward.valid_from),
    valid_until:
      createdReward.valid_until === null
        ? undefined
        : toISOStringSafe(createdReward.valid_until),
    is_active: createdReward.is_active,
    created_at: toISOStringSafe(createdReward.created_at),
    updated_at: toISOStringSafe(createdReward.updated_at),
    deleted_at:
      createdReward.deleted_at === null
        ? undefined
        : toISOStringSafe(createdReward.deleted_at),
  };
}
