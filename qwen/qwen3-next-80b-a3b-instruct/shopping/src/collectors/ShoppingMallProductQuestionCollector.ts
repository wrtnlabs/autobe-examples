import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductQuestion";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductQuestionCollector {
  export async function collect(props: {
    body: IShoppingMallProductQuestion.ICreate;
    shoppingMallProducts: IEntity;
    shoppingMallCustomers: IEntity;
    shoppingMallCustomerSessions: IEntity;
  }) {
    return {
      id: v4(),
      title: "",
      body: props.body.question,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      product: {
        connect: { id: props.shoppingMallProducts.id },
      },
      customer: {
        connect: { id: props.shoppingMallCustomers.id },
      },
    } satisfies Prisma.shopping_mall_product_questionsCreateInput;
  }
}
