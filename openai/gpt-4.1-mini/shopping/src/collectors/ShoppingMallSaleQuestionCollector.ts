import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSaleQuestionCollector {
  export async function collect(props: {
    body: IShoppingMallSaleQuestion.ICreate & {
      title: string;
      body: string;
      status: string;
    };
    sale: IEntity;
    customer: IEntity;
  }) {
    return {
      id: v4(),
      title: props.body.title,
      body: props.body.body,
      status: props.body.status,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      sale: { connect: { id: props.sale.id } },
      customer: { connect: { id: props.customer.id } },
    } satisfies Prisma.shopping_mall_sale_questionsCreateInput;
  }
}
