import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestionAnswer";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSaleQuestionAnswerCollector {
  export async function collect(props: {
    body: IShoppingMallSaleQuestionAnswer.ICreate;
    saleQuestion: IEntity;
    seller: IEntity;
    title: string;
    bodyText: string;
  }) {
    const id = v4();
    return {
      id,
      title: props.title,
      body: props.bodyText,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      saleQuestion: { connect: { id: props.saleQuestion.id } },
      seller: { connect: { id: props.seller.id } },
    } satisfies Prisma.shopping_mall_sale_question_answersCreateInput;
  }
}
