import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBannedUser";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallBannedUserCollector } from "../collectors/ShoppingMallBannedUserCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallBannedUserTransformer } from "../transformers/ShoppingMallBannedUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorBannedUsers(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallBannedUser.ICreate;
}): Promise<IShoppingMallBannedUser> {
  if (
    !!props.body.shoppingMallCustomerId === !!props.body.shoppingMallSellerId
  ) {
    throw new HttpException(
      "Exactly one of shoppingMallCustomerId or shoppingMallSellerId must be provided",
      400,
    );
  }
  const data = await ShoppingMallBannedUserCollector.collect({
    body: props.body,
  });
  const createdRecord = await MyGlobal.prisma.shopping_mall_banned_users.create(
    {
      data,
      ...ShoppingMallBannedUserTransformer.select(),
    },
  );
  // Audit logging placeholder (implement as needed)
  // await MyGlobal.prisma.shopping_mall_administrative_audit_logs.create({
  //   data: {
  //     id: v4() as string & tags.Format<'uuid'>,
  //     administrator_id: props.administrator.id,
  //     action: 'ban_create',
  //     details: JSON.stringify({ bannedUserId: createdRecord.id }),
  //     created_at: (new Date()).toISOString() as string & tags.Format<'date-time'>,
  //     updated_at: (new Date()).toISOString() as string & tags.Format<'date-time'>,
  //   }
  // });
  return await ShoppingMallBannedUserTransformer.transform(createdRecord);
}
