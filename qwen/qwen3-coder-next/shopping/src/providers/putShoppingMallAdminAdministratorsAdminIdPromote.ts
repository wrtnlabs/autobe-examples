import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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

export async function putShoppingMallAdminAdministratorsAdminIdPromote(props: {
  admin: AdminPayload;
  adminId: string;
  body: IShoppingMallAdmin.IPromote;
}): Promise<IShoppingMallAdmin> {
  const admin = await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
    where: { id: props.adminId },
  });
  if (admin.role_grade !== "regular") {
    throw new HttpException(
      "Administrator must have regular grade to be promoted",
      400,
    );
  }
  if (admin.id === props.admin.id) {
    throw new HttpException(
      "Super administrators cannot promote themselves",
      400,
    );
  }
  const updated = await MyGlobal.prisma.shopping_mall_admins.update({
    where: { id: props.adminId },
    data: {
      role_grade: "super",
      updated_at: new Date().toISOString(),
    },
    select: {
      id: true,
      email: true,
      role_grade: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  await MyGlobal.prisma.shopping_mall_system_audit_logs.create({
    data: {
      id: v4(),
      actor_id: props.admin.id,
      actor_type: "admin",
      operation_type: "promote",
      entity_type: "admin",
      entity_id: props.adminId,
      ip_address: "127.0.0.1",
      user_agent: "System",
      description: `Promoted administrator ${props.adminId} to super grade: ${props.body.reason}`,
      new_values: JSON.stringify({ role_grade: "super" }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });
  return {
    id: updated.id,
    reason: props.body.reason,
    status: "approved",
    created_at: updated.created_at.toISOString(),
    approved_at: updated.updated_at.toISOString(),
    rejected_at: null,
    rejection_reason: null,
    requester: {
      id: props.admin.id,
      email: props.admin.id as string,
      created_at: updated.created_at.toISOString(),
      updated_at: updated.updated_at.toISOString(),
      display_name: null,
      phone_number: null,
      email_verified: false,
    } satisfies IShoppingMallCustomer.ISummary,
  };
}
