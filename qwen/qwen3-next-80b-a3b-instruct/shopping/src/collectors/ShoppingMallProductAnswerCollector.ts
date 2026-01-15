import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAnswer";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductAnswerCollector {
  export async function collect(props: {
    body: IShoppingMallProductAnswer.ICreate;
    shoppingMallCustomers: IEntity; // from authorized actor
    shoppingMallProductQuestions: IEntity; // from path parameter questionId
  }) {
    return {
      id: v4(),
      title: props.body.content,
      body: props.body.content,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      question: {
        connect: { id: props.shoppingMallProductQuestions.id },
      },
      seller: {
        connect: { id: props.shoppingMallCustomers.id },
      },
    } satisfies Prisma.shopping_mall_product_answersCreateInput;
  }
}
