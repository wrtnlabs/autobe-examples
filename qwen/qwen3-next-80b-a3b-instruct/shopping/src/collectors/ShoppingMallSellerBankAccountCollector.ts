import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerBankAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerBankAccount";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSellerBankAccountCollector {
  export async function collect(props: {
    body: IShoppingMallSellerBankAccount.ICreate;
    shoppingMallSellers: IEntity;
    shoppingMallSellerSessions: IEntity;
  }) {
    return {
      id: v4(),
      account_holder_name: props.body.account_holder_name,
      bank_name: props.body.bank_name,
      account_number: props.body.account_number,
      routing_number: props.body.routing_number,
      account_status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      seller: {
        connect: { id: props.shoppingMallSellers.id },
      },
    } satisfies Prisma.shopping_mall_seller_bank_accountsCreateInput;
  }
}
