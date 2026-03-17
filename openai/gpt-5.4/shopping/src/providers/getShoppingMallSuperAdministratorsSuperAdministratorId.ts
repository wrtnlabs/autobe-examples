import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSuperAdministratorTransformer } from "../transformers/ShoppingMallSuperAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSuperAdministratorsSuperAdministratorId(props: {
  superAdministratorId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSuperAdministrator> {
  const record =
    await MyGlobal.prisma.shopping_mall_super_administrators.findUniqueOrThrow({
      where: {
        id: props.superAdministratorId,
      },
      ...ShoppingMallSuperAdministratorTransformer.select(),
    });
  return await ShoppingMallSuperAdministratorTransformer.transform(record);
}
