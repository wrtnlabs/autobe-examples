import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminGradeRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminGradeRequest";
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

export async function postEcommerceMallAdminAdminGrades(props: {
  admin: AdminPayload;
  body: IEcommerceMallAdminGradeRequest.IPromote;
}): Promise<IEcommerceMallAdmin> {
  // Verify requesting user exists
  const requestingAdmin =
    await MyGlobal.prisma.ecommerce_mall_admins.findUnique({
      where: { id: props.admin.id },
      select: { id: true, email: true, is_banned: true },
    });
  if (requestingAdmin === null) {
    throw new HttpException("Super administrator privileges required", 403);
  }
  // Validate target administrator exists
  const targetAdmin = await MyGlobal.prisma.ecommerce_mall_admins.findUnique({
    where: { id: props.body.targetAdministratorId },
    select: {
      id: true,
      email: true,
      is_banned: true,
    },
  });
  if (targetAdmin === null) {
    throw new HttpException("Administrator not found", 404);
  }
  if (targetAdmin.id === props.admin.id) {
    throw new HttpException("Cannot promote yourself", 422);
  }
  // Begin transaction to atomically update admin and create snapshot
  const [updatedAdmin] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.ecommerce_mall_admins.update({
      where: { id: targetAdmin.id },
      data: { updated_at: toISOStringSafe(new Date()) },
      select: EcommerceMallAdminTransformer.select().select,
    }),
    MyGlobal.prisma.ecommerce_mall_snapshot_audits.create({
      data: {
        id: v4(),
        record_type: "admin_grade",
        record_id: targetAdmin.id,
        changes: JSON.stringify({
          field: "grade",
          from: "regular",
          to: "super",
        }),
        old_values: JSON.stringify({ grade: "regular" }),
        new_values: JSON.stringify({ grade: "super" }),
        changed_at: toISOStringSafe(new Date()),
        changed_by: props.admin.id,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    }),
  ]);
  // Return updated admin using transformer
  return await EcommerceMallAdminTransformer.transform(updatedAdmin);
}
