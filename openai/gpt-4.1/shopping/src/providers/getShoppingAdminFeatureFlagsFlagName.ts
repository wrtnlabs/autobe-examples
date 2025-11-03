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

export async function getShoppingAdminFeatureFlagsFlagName(props: {
  admin: AdminPayload;
  flagName: string;
}): Promise<IShoppingFeatureFlag> {
  const flag = await MyGlobal.prisma.shopping_feature_flags.findFirst({
    where: {
      flag_name: props.flagName,
      deleted_at: null,
    },
  });
  if (!flag) {
    throw new HttpException("Feature flag not found", 404);
  }
  return {
    id: flag.id,
    flag_name: flag.flag_name,
    scope: flag.scope,
    enabled: flag.enabled,
    rollout:
      flag.rollout !== null && flag.rollout !== undefined
        ? flag.rollout
        : undefined,
    description: flag.description,
    created_at: toISOStringSafe(flag.created_at),
    updated_at: toISOStringSafe(flag.updated_at),
    ...(flag.deleted_at !== null &&
      flag.deleted_at !== undefined && {
        deleted_at: toISOStringSafe(flag.deleted_at),
      }),
  };
}
