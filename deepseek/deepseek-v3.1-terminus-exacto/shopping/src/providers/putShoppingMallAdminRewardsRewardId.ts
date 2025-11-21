import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReward } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReward";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminRewardsRewardId(props: {
  admin: AdminPayload;
  rewardId: string & tags.Format<"uuid">;
  body: IShoppingMallReward.IUpdate;
}): Promise<IShoppingMallReward> {
  // Verify the reward program exists
  const existingReward = await MyGlobal.prisma.shopping_mall_rewards.findUnique(
    {
      where: { id: props.rewardId, deleted_at: null },
    },
  );

  if (!existingReward) {
    throw new HttpException("Reward program not found", 404);
  }

  // Check for name conflicts if name is being updated
  if (
    props.body.name !== undefined &&
    props.body.name !== existingReward.name
  ) {
    const conflictingReward =
      await MyGlobal.prisma.shopping_mall_rewards.findFirst({
        where: {
          name: props.body.name,
          deleted_at: null,
          id: { not: props.rewardId },
        },
      });

    if (conflictingReward) {
      throw new HttpException(
        "A reward program with this name already exists",
        409,
      );
    }
  }

  // Validate date logic if both dates are provided
  if (
    props.body.valid_from !== undefined &&
    props.body.valid_until !== undefined
  ) {
    const validFrom = new Date(props.body.valid_from);
    const validUntil = new Date(props.body.valid_until);

    if (validUntil <= validFrom) {
      throw new HttpException(
        "Valid until date must be after valid from date",
        400,
      );
    }
  }

  // Update the reward program with inline parameters
  const updated = await MyGlobal.prisma.shopping_mall_rewards.update({
    where: { id: props.rewardId },
    data: {
      ...props.body,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the complete updated reward program
  return {
    id: updated.id,
    name: updated.name,
    description: updated.description,
    reward_type: updated.reward_type,
    earning_rules: updated.earning_rules,
    redemption_rules: updated.redemption_rules,
    coin_value: updated.coin_value,
    minimum_purchase: updated.minimum_purchase ?? undefined,
    maximum_coins: updated.maximum_coins ?? undefined,
    valid_from: toISOStringSafe(updated.valid_from),
    valid_until: updated.valid_until
      ? toISOStringSafe(updated.valid_until)
      : undefined,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
