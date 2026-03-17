import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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
  // Prevent super admin from demoting themselves
  if (props.adminId === props.superAdmin.id) {
    throw new HttpException("Cannot demote yourself", 400);
  }
  // Build update data with only provided fields
  const updateData: Prisma.shopping_mall_adminsUpdateInput = {
    ...(props.body.grade !== undefined && { grade: props.body.grade }),
    updated_at: new Date(),
  };
  // Perform the update and fetch the updated record in one operation
  const updated = await MyGlobal.prisma.shopping_mall_admins.update({
    where: {
      id: props.adminId,
      deleted_at: null,
    },
    data: updateData,
    ...ShoppingMallAdminTransformer.select(),
  });
  return await ShoppingMallAdminTransformer.transform(updated);
}
