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

export async function patchEcommerceMallAdminAdminsAdminIdPromote(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IEcommerceMallAdmin.IPromoteRequest;
}): Promise<IEcommerceMallAdmin> {
  const requestingAdmin =
    await MyGlobal.prisma.ecommerce_mall_admins.findUniqueOrThrow({
      where: { id: props.admin.id },
      select: { id: true },
    });
  if (requestingAdmin.id === props.adminId) {
    throw new HttpException("Cannot promote yourself", 409);
  }
  const targetAdmin = await MyGlobal.prisma.ecommerce_mall_admins.findUnique({
    where: { id: props.adminId },
    select: { id: true, email: true, is_banned: true, created_at: true },
  });
  if (targetAdmin === null) {
    throw new HttpException("Administrator not found", 404);
  }
  if (targetAdmin.is_banned) {
    throw new HttpException("Cannot promote a banned administrator", 400);
  }
  const now = new Date().toISOString();
  await MyGlobal.prisma.ecommerce_mall_admins.update({
    where: { id: props.adminId },
    data: {
      updated_at: now,
    },
  });
  const snapshotId = v4();
  await MyGlobal.prisma.ecommerce_mall_admin_request_snapshots.create({
    data: {
      id: snapshotId,
      changed_by: props.admin.id,
      reason: `Admin promoted to super administrator by ${targetAdmin.email}`,
      request_status: "approved",
      created_at: targetAdmin.created_at.toISOString(),
      changed_at: now,
    },
  });
  const updatedAdmin =
    await MyGlobal.prisma.ecommerce_mall_admins.findUniqueOrThrow({
      where: { id: props.adminId },
      ...EcommerceMallAdminTransformer.select(),
    });
  return await EcommerceMallAdminTransformer.transform(updatedAdmin);
}
