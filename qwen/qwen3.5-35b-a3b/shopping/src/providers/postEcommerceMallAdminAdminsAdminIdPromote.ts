import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAdminTransformer } from "../transformers/EcommerceMallAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminAdminsAdminIdPromote(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IEcommerceMallAdmin.IPromoteRequest;
}): Promise<IEcommerceMallAdmin> {
  // Authorization: Verify requesting user is super administrator
  if (props.admin.type !== "admin") {
    throw new HttpException("Forbidden", 403);
  }
  // Validate: Check target admin exists
  const targetAdmin = await MyGlobal.prisma.ecommerce_mall_admins.findUnique({
    where: { id: props.adminId },
  });
  if (targetAdmin === null) {
    throw new HttpException("Not Found", 404);
  }
  // Validate: Prevent self-promotion
  if (targetAdmin.id === props.admin.id) {
    throw new HttpException("Conflict", 409);
  }
  // Execute promotion: Update to super administrator
  const updatedAdmin = await MyGlobal.prisma.ecommerce_mall_admins.update({
    where: { id: props.adminId },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
    ...EcommerceMallAdminTransformer.select(),
  });
  // Create audit log entry for promotion
  await MyGlobal.prisma.ecommerce_mall_admin_audit_logs.create({
    data: {
      id: v4(),
      action_type: "admin_promote",
      admin_id: props.admin.id,
      target_entity_type: "ecommerce_mall_admins",
      target_entity_id: props.adminId,
      changes: "Promoted regular administrator to super administrator",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Return transformed admin
  return await EcommerceMallAdminTransformer.transform(updatedAdmin);
}
