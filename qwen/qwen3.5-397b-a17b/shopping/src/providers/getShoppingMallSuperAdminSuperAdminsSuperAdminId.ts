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

export async function getShoppingMallSuperAdminSuperAdminsSuperAdminId(props: {
  superAdmin: SuperadminPayload;
  superAdminId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSuperAdmin> {
  const record =
    await MyGlobal.prisma.shopping_mall_super_admins.findFirstOrThrow({
      where: {
        id: props.superAdminId,
        deleted_at: null,
      },
      ...ShoppingMallSuperAdminTransformer.select(),
    });
  return await ShoppingMallSuperAdminTransformer.transform(record);
}
