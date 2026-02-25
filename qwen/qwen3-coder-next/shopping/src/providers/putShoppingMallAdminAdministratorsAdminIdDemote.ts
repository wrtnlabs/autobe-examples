import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function putShoppingMallAdminAdministratorsAdminIdDemote(props: {
  admin: AdminPayload;
  adminId: string;
}): Promise<void> {
  const currentAdmin =
    await MyGlobal.prisma.shopping_mall_admins.findFirstOrThrow({
      where: { id: props.admin.id },
    });
  if (currentAdmin.role_grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  if (currentAdmin.id === props.adminId) {
    throw new HttpException("Forbidden", 403);
  }
  const targetAdmin =
    await MyGlobal.prisma.shopping_mall_admins.findFirstOrThrow({
      where: { id: props.adminId, role_grade: "super" },
    });
  await MyGlobal.prisma.shopping_mall_admins.update({
    where: { id: props.adminId },
    data: { role_grade: "regular" },
  });
  const now = new Date();
  await MyGlobal.prisma.shopping_mall_system_audit_logs.create({
    data: {
      id: v4(),
      actor_type: "admin",
      actor_id: props.admin.id,
      operation_type: "admin_demotion",
      entity_type: "admin",
      entity_id: props.adminId,
      ip_address: "",
      user_agent: "",
      old_values: JSON.stringify({
        grade: "super",
      }),
      new_values: JSON.stringify({
        grade: "regular",
      }),
      description: `Demoted admin ${props.adminId} from super to regular grade`,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      deleted_at: null,
    },
  });
}
