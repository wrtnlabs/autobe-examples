import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ShoppingMallSuperAdministratorTransformer } from "../transformers/ShoppingMallSuperAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSuperAdministratorSuperAdministratorsSuperAdministratorId(props: {
  superAdministrator: SuperadministratorPayload;
  superAdministratorId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSuperAdministrator> {
  const superAdministrator =
    await MyGlobal.prisma.shopping_mall_super_administrators.findUniqueOrThrow({
      where: { id: props.superAdministratorId },
      ...ShoppingMallSuperAdministratorTransformer.select(),
    });
  return await ShoppingMallSuperAdministratorTransformer.transform(
    superAdministrator,
  );
}
