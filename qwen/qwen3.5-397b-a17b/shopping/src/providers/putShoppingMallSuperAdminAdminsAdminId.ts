import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
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
  await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
    where: { id: props.adminId },
  });
  if (props.body.grade === "regular" && props.adminId === props.superAdmin.id) {
    throw new HttpException("Cannot demote yourself", 403);
  }
  await MyGlobal.prisma.shopping_mall_admins.update({
    where: { id: props.adminId },
    data: {
      ...(props.body.grade !== undefined && { grade: props.body.grade }),
      ...(props.body.banned_at !== undefined && {
        banned_at: props.body.banned_at,
      }),
    },
  });
  const updated = await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
    where: { id: props.adminId },
    ...ShoppingMallAdminTransformer.select(),
  });
  return await ShoppingMallAdminTransformer.transform(updated);
}
