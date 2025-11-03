import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingFeatureFlag";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingAdminFeatureFlagsFlagName(props: {
  admin: AdminPayload;
  flagName: string;
  body: IShoppingFeatureFlag.IUpdate;
}): Promise<IShoppingFeatureFlag> {
  // Step 1: Find feature flag by flagName, not deleted
  const flag = await MyGlobal.prisma.shopping_feature_flags.findFirst({
    where: {
      flag_name: props.flagName,
      deleted_at: null,
    },
  });
  if (!flag) {
    throw new HttpException("Feature flag not found", 404);
  }

  // Step 2: Validate rollout if provided
  if (props.body.rollout !== undefined && props.body.rollout !== null) {
    if (props.body.rollout < 0 || props.body.rollout > 100) {
      throw new HttpException(
        "Rollout percentage must be between 0 and 100",
        400,
      );
    }
  }

  // Step 3: Update feature flag
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_feature_flags.update({
    where: { id: flag.id },
    data: {
      enabled: props.body.enabled,
      rollout: props.body.rollout !== undefined ? props.body.rollout : null,
      scope: props.body.scope,
      description: props.body.description,
      updated_at: now,
    },
  });

  // Step 4: Return as IShoppingFeatureFlag
  return {
    id: updated.id,
    flag_name: updated.flag_name,
    scope: updated.scope,
    enabled: updated.enabled,
    rollout: updated.rollout,
    description: updated.description,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
