import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallSuperAdminTransformer } from "../transformers/ShoppingMallSuperAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSuperAdminSuperAdminsSuperAdminId(props: {
  superAdmin: SuperadminPayload;
  superAdminId: string & tags.Format<"uuid">;
  body: IShoppingMallSuperAdmin.IUpdate;
}): Promise<IShoppingMallSuperAdmin> {
  await MyGlobal.prisma.shopping_mall_super_admins.findUniqueOrThrow({
    where: { id: props.superAdminId },
  });
  if (props.body.email !== undefined) {
    const existingEmail =
      await MyGlobal.prisma.shopping_mall_super_admins.findFirst({
        where: {
          email: props.body.email,
          id: { not: props.superAdminId },
          deleted_at: null,
        },
      });
    if (existingEmail !== null) {
      throw new HttpException("Email already exists", 409);
    }
  }
  const updateData: Prisma.shopping_mall_super_adminsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.email !== undefined) {
    updateData.email = props.body.email;
  }
  if (props.body.password !== undefined) {
    updateData.password_hash = await PasswordUtil.hash(props.body.password);
  }
  await MyGlobal.prisma.shopping_mall_super_admins.update({
    where: { id: props.superAdminId },
    data: updateData,
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_super_admins.findUniqueOrThrow({
      where: { id: props.superAdminId },
      ...ShoppingMallSuperAdminTransformer.select(),
    });
  return await ShoppingMallSuperAdminTransformer.transform(updated);
}
