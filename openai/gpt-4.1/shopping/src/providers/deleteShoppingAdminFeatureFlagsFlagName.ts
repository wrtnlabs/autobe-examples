import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminFeatureFlagsFlagName(props: {
  admin: AdminPayload;
  flagName: string;
}): Promise<void> {
  // 1. Find the feature flag by flag_name and ensure it is not soft-deleted
  const flag = await MyGlobal.prisma.shopping_feature_flags.findFirst({
    where: {
      flag_name: props.flagName,
      deleted_at: null,
    },
  });
  if (!flag) {
    throw new HttpException("Feature flag not found", 404);
  }

  // 2. Hard delete the feature flag using the compound unique key (flag_name + scope)
  await MyGlobal.prisma.shopping_feature_flags.delete({
    where: {
      flag_name_scope: {
        flag_name: flag.flag_name,
        scope: flag.scope,
      },
    },
  });

  // 3. Audit log the deletion
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_audit_logs.create({
    data: {
      id: v4(),
      admin_id: props.admin.id,
      seller_id: null,
      customer_id: null,
      category: "feature_flag",
      event_type: "ADMIN_DELETE_FEATURE_FLAG",
      ip: null,
      description: `Admin deleted feature flag: ${props.flagName}`,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
}
