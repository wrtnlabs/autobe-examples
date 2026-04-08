import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallAdministratorTransformer } from "../transformers/ShoppingMallAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminAdministratorsAdministratorId(props: {
  admin: AdminPayload;
  administratorId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministrator> {
  const record =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: {
        id: props.administratorId,
        deleted_at: null,
      },
      ...ShoppingMallAdministratorTransformer.select(),
    });
  return await ShoppingMallAdministratorTransformer.transform(record);
}
