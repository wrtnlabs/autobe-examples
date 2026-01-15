import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentTokenization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTokenization";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallPaymentTokenizationCollector {
  export async function collect(props: {
    body: IShoppingMallPaymentTokenization.ICreate;
    shoppingMallCustomers: IEntity;
  }) {
    return {
      id: v4(),
      actor_type: "customer",
      token_id: props.body.masked_payment_info,
      token_data: props.body.encrypted_data,
      encrypted_key: "",
      is_default: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      payment_method_type: props.body.payment_method_type,
      customer: {
        connect: { id: props.shoppingMallCustomers.id },
      },
      seller: undefined,
    } satisfies Prisma.shopping_mall_payment_tokenizationsCreateInput;
  }
}
