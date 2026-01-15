import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentVaultEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentVaultEntry";
import { IShoppingMallPaymentVaultEntryMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentVaultEntryMetadata";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallPaymentVaultEntryCollector {
  export async function collect(props: {
    body: IShoppingMallPaymentVaultEntry.ICreate;
    shoppingMallCustomers: IEntity;
  }) {
    // Query the paymentMethod record based on payment_method_type
    const paymentMethod =
      await MyGlobal.prisma.shopping_mall_payment_methods.findFirstOrThrow({
        where: {
          type: props.body.payment_method_type,
        },
      });
    return {
      id: v4(),
      encrypted_data: props.body.tokenized_data,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: {
        connect: { id: props.shoppingMallCustomers.id },
      },
      paymentMethod: {
        connect: { id: paymentMethod.id },
      },
    } satisfies Prisma.shopping_mall_payment_vault_entriesCreateInput;
  }
}
