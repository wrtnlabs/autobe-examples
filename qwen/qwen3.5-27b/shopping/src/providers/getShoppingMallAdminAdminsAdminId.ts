import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallAdminTransformer } from "../transformers/ShoppingMallAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdmin> {
  const admin = await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
    where: {
      id: props.adminId,
      deleted_at: null,
    },
    ...ShoppingMallAdminTransformer.select(),
  });
  return await ShoppingMallAdminTransformer.transform(admin);
}
