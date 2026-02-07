import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystematicFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicFeatureFlag";
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

export async function putShoppingMallAdminFeatureFlagsFeatureFlagId(props: {
  admin: AdminPayload;
  featureFlagId: string;
  body: IShoppingMallSystematicFeatureFlag.IUpdate;
}): Promise<IShoppingMallSystematicFeatureFlag> {
  // Find existing feature flag to verify it exists
  const existing =
    await MyGlobal.prisma.shopping_mall_systematic_feature_flags.findUnique({
      where: { id: props.featureFlagId },
    });
  if (!existing) {
    throw new HttpException("Feature flag not found", 404);
  }
  // Update the feature flag with provided fields
  const updated =
    await MyGlobal.prisma.shopping_mall_systematic_feature_flags.update({
      where: { id: props.featureFlagId },
      data: props.body,
    });
  // Return the updated record
  return {
    id: updated.id,
    feature_name: updated.feature_name,
    description: updated.description,
    is_enabled: updated.is_enabled,
    target_actor: updated.target_actor,
    rollout_percentage: updated.rollout_percentage,
    expires_at: updated.expires_at ? toISOStringSafe(updated.expires_at) : null,
  };
}
