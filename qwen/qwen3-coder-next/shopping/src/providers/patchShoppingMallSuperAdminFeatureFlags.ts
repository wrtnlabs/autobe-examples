import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystematicFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicFeatureFlag";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSuperAdminFeatureFlags(props: {
  superAdmin: SuperadminPayload;
  body: IShoppingMallSystematicFeatureFlag.IUpdate;
}): Promise<IShoppingMallSystematicFeatureFlag> {
  // Find existing feature flag using feature_name from request body
  const existingFlag =
    await MyGlobal.prisma.shopping_mall_systematic_feature_flags.findUnique({
      where: { feature_name: (props.body as any).feature_name },
    });
  if (!existingFlag) {
    throw new HttpException("Feature flag not found", 404);
  }
  // Since IUpdate is empty ({}), no update fields are provided
  // Return the existing feature flag with proper type conversions
  const result = {
    id: existingFlag.id,
    feature_name: existingFlag.feature_name,
    description: existingFlag.description,
    is_enabled: existingFlag.is_enabled,
    target_actor: existingFlag.target_actor,
    rollout_percentage: existingFlag.rollout_percentage,
    expires_at: existingFlag.expires_at
      ? toISOStringSafe(existingFlag.expires_at)
      : null,
  };
  return result;
}
