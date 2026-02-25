import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemVersion";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSystemVersionCollector } from "../collectors/ShoppingMallSystemVersionCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallSystemVersionTransformer } from "../transformers/ShoppingMallSystemVersionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorSystemVersions(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSystemVersion.ICreate;
}): Promise<IShoppingMallSystemVersion> {
  const collectedData = await ShoppingMallSystemVersionCollector.collect({
    body: props.body,
  });
  const createdRecord =
    await MyGlobal.prisma.shopping_mall_system_versions.create({
      data: collectedData,
    });
  const result =
    await ShoppingMallSystemVersionTransformer.transform(createdRecord);
  return result;
}
