import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerCommunicationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerCommunicationLog";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSellerCommunicationLogCollector {
  export async function collect(props: {
    body: IShoppingMallSellerCommunicationLog.ICreate;
    shoppingMallSellers: IEntity;
    shoppingMallSellerSessions: IEntity;
  }) {
    return {
      id: v4(),
      subject: null,
      body: props.body.message,
      sender_type: "seller",
      recipient_type: "platform",
      is_read: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      seller: {
        connect: { id: props.shoppingMallSellers.id },
      },
    } satisfies Prisma.shopping_mall_seller_communication_logsCreateInput;
  }
}
