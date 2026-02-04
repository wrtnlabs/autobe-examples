import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallSuperAdminTransformer } from "../transformers/ShoppingMallSuperAdminTransformer";

export async function getShoppingMallSuperAdminSuperAdminsMe(props: {
  superAdmin: SuperadminPayload;
}): Promise<IShoppingMallSuperAdmin> {
  const superAdmin =
    await MyGlobal.prisma.shopping_mall_super_admins.findUnique({
      where: {
        id: props.superAdmin.id,
      },
      ...ShoppingMallSuperAdminTransformer.select(),
    });
  if (!superAdmin) {
    throw new HttpException("Super administrator not found", 404);
  }
  return await ShoppingMallSuperAdminTransformer.transform(superAdmin);
}
