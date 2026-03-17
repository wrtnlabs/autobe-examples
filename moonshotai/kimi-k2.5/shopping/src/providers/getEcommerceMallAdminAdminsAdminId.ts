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

export async function getEcommerceMallAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string;
}): Promise<IEcommerceMallAdmin> {
  // Check if trying to view own record
  const isViewingSelf = props.admin.id === props.adminId;
  if (!isViewingSelf) {
    // Need to check if the authenticated admin is a super_admin
    // Query current admin record to check grade
    const currentAdmin =
      await MyGlobal.prisma.ecommerce_mall_admins.findUniqueOrThrow({
        where: { id: props.admin.id },
        select: { grade: true },
      });
    if (currentAdmin.grade !== "super_admin") {
      throw new HttpException(
        "Only super administrators can view other administrator records",
        403,
      );
    }
  }
  // Query the target admin with proper selection
  const targetAdmin =
    await MyGlobal.prisma.ecommerce_mall_admins.findUniqueOrThrow({
      where: { id: props.adminId },
      ...EcommerceMallAdminTransformer.select(),
    });
  return await EcommerceMallAdminTransformer.transform(targetAdmin);
}
