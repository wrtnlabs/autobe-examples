import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminRewardsRewardId(props: {
  admin: AdminPayload;
  rewardId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check if reward program exists and is not deleted
  const reward = await MyGlobal.prisma.shopping_mall_rewards.findFirst({
    where: {
      id: props.rewardId,
      deleted_at: null,
    },
  });

  if (!reward) {
    throw new HttpException("Reward program not found", 404);
  }

  // Check if reward program is active
  if (reward.is_active) {
    throw new HttpException("Cannot delete active reward program", 400);
  }

  // Note: Cannot check customer coin associations because shopping_mall_coins
  // schema has no reward_id field to establish relationship

  // Perform soft deletion
  await MyGlobal.prisma.shopping_mall_rewards.update({
    where: { id: props.rewardId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
