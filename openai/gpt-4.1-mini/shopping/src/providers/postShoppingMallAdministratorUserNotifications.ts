import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallUserNotificationCollector } from "../collectors/ShoppingMallUserNotificationCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallUserNotificationTransformer } from "../transformers/ShoppingMallUserNotificationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorUserNotifications(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallUserNotification.ICreate;
}): Promise<IShoppingMallUserNotification> {
  const data = await ShoppingMallUserNotificationCollector.collect({
    body: props.body,
  });
  const created = await MyGlobal.prisma.shopping_mall_user_notifications.create(
    {
      data,
      ...ShoppingMallUserNotificationTransformer.select(),
    },
  );
  return await ShoppingMallUserNotificationTransformer.transform(created);
}
