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
import { EcommerceMallAdminAtAtDemoteTransformer } from "../transformers/EcommerceMallAdminAtAtDemoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminAdminsAdminIdDemote(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IEcommerceMallAdmin.IDemoteRequest;
}): Promise<IEcommerceMallAdmin.IAtDemote> {
  // 1. Verify requesting admin is not banned
  const requestingAdmin =
    await MyGlobal.prisma.ecommerce_mall_admins.findUniqueOrThrow({
      where: { id: props.admin.id },
      select: { id: true, is_banned: true },
    });
  if (requestingAdmin.is_banned) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Get target admin and verify they exist
  const targetAdmin =
    await MyGlobal.prisma.ecommerce_mall_admins.findUniqueOrThrow({
      where: { id: props.adminId },
    });
  // 3. Prevent self-demotion
  if (requestingAdmin.id === props.adminId) {
    throw new HttpException("Self-demotion is not permitted", 403);
  }
  // 4. Execute demotion transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update admin - set updated_at
    await tx.ecommerce_mall_admins.update({
      where: { id: props.adminId },
      data: {
        updated_at: new Date().toISOString(),
      },
    });
    // Create immutable snapshot for audit trail
    await tx.ecommerce_mall_snapshot_audits.create({
      data: {
        id: v4(),
        record_type: "admin_grade_change",
        record_id: props.adminId,
        changes: JSON.stringify({
          admin_grade: { from: "super", to: "regular" },
        }),
        old_values: JSON.stringify({ admin_grade: "super" }),
        new_values: JSON.stringify({ admin_grade: "regular" }),
        changed_by: props.admin.id,
        changed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  });
  // 5. Fetch updated admin with transformer's select
  const updatedAdmin =
    await MyGlobal.prisma.ecommerce_mall_admins.findUniqueOrThrow({
      where: { id: props.adminId },
      ...EcommerceMallAdminAtAtDemoteTransformer.select(),
    });
  // 6. Transform and return response
  return await EcommerceMallAdminAtAtDemoteTransformer.transform(updatedAdmin);
}
