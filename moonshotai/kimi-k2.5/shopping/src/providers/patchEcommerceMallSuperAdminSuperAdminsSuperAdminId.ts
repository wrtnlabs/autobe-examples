import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallSuperAdminTransformer } from "../transformers/EcommerceMallSuperAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminSuperAdminsSuperAdminId(props: {
  superAdmin: SuperadminPayload;
  superAdminId: string & tags.Format<"uuid">;
  body: IEcommerceMallSuperAdmin.IUpdate;
}): Promise<IEcommerceMallSuperAdmin> {
  // Verify target exists and is a super admin
  const target =
    await MyGlobal.prisma.ecommerce_mall_super_admins.findUniqueOrThrow({
      where: { id: props.superAdminId },
      select: {
        id: true,
        email: true,
        grade: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // Verify target currently has 'super' grade
  if (target.grade !== "super") {
    throw new HttpException("Target is not a super administrator", 400);
  }
  // Self-demotion prevention
  if (target.id === props.superAdmin.id) {
    throw new HttpException(
      "Super administrators cannot demote themselves",
      400,
    );
  }
  // Minimum super admin check - count remaining super admins
  const superAdminCount =
    await MyGlobal.prisma.ecommerce_mall_super_admins.count({
      where: { grade: "super", deleted_at: null },
    });
  if (superAdminCount <= 1) {
    throw new HttpException(
      "At least one super administrator must remain",
      400,
    );
  }
  // Update the target super admin to regular
  const updated = await MyGlobal.prisma.ecommerce_mall_super_admins.update({
    where: { id: props.superAdminId },
    data: {
      grade: props.body.grade,
      updated_at: new Date(),
    },
    ...EcommerceMallSuperAdminTransformer.select(),
  });
  return await EcommerceMallSuperAdminTransformer.transform(updated);
}
