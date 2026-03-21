import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminTransformer } from "../transformers/EcommerceMallAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminAdminsAdminId(props: {
  superAdmin: SuperadminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IEcommerceMallAdmin.IUpdate;
}): Promise<IEcommerceMallAdmin> {
  // Find existing admin
  const existingAdmin = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: {
      id: props.adminId,
      deleted_at: null,
    },
  });
  // Validate admin exists and is not soft-deleted
  if (existingAdmin === null) {
    throw new HttpException("Administrator not found", 404);
  }
  // If email is being updated, verify uniqueness against other active admins
  if (
    props.body.email !== undefined &&
    props.body.email !== existingAdmin.email
  ) {
    const emailExists = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
      where: {
        email: props.body.email,
        deleted_at: null,
        id: { not: props.adminId },
      },
    });
    if (emailExists !== null) {
      throw new HttpException(
        "Email already in use by another administrator",
        400,
      );
    }
  }
  // Apply partial updates
  const updatedAdmin = await MyGlobal.prisma.ecommerce_mall_admins.update({
    where: { id: props.adminId },
    data: {
      ...(props.body.email !== undefined && { email: props.body.email }),
      ...(props.body.name !== undefined && { name: props.body.name }),
      updated_at: new Date(),
    },
    ...EcommerceMallAdminTransformer.select(),
  });
  return await EcommerceMallAdminTransformer.transform(updatedAdmin);
}
