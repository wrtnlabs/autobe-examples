import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallAdminTransformer } from "../transformers/ShoppingMallAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSuperAdminAdminsAdminId(props: {
  superAdmin: SuperadminPayload;
  adminId: string & tags.Format<"uuid">;
  body: IShoppingMallAdmin.IUpdate;
}): Promise<IShoppingMallAdmin> {
  // Step 1: Verify the target admin exists and is not soft-deleted
  const existing = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: {
      id: props.adminId,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
    },
  });
  if (existing === null) {
    throw new HttpException("Administrator not found", 404);
  }
  // Step 2: Email uniqueness check if email is being changed
  if (props.body.email !== undefined && props.body.email !== existing.email) {
    const conflict = await MyGlobal.prisma.shopping_mall_admins.findFirst({
      where: {
        email: props.body.email,
        id: { not: props.adminId },
      },
      select: { id: true },
    });
    if (conflict !== null) {
      throw new HttpException(
        "Email already in use by another administrator",
        409,
      );
    }
  }
  // Step 3: Build update data
  const passwordHash =
    props.body.password !== undefined
      ? await PasswordUtil.hash(props.body.password)
      : undefined;
  // Step 4: Apply atomic update
  await MyGlobal.prisma.shopping_mall_admins.update({
    where: { id: props.adminId },
    data: {
      ...(props.body.email !== undefined && { email: props.body.email }),
      ...(passwordHash !== undefined && { password_hash: passwordHash }),
      updated_at: new Date(),
    },
  });
  // Step 5: Reload and return the updated record
  const updated = await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
    where: { id: props.adminId },
    ...ShoppingMallAdminTransformer.select(),
  });
  return ShoppingMallAdminTransformer.transform(updated);
}
