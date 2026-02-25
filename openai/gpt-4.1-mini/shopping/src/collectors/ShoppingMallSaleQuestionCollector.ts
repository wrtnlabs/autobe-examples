import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSaleQuestionCollector {
  export async function collect(props: {
    body: IShoppingMallSaleQuestion.ICreate;
    sale: IEntity;
    customer: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      body: props.body.body,
      status: "open",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      sale: { connect: { id: props.sale.id } },
      customer: { connect: { id: props.customer.id } },
      // saleQuestionAnswer is hasOne relation, omitted in create
    } satisfies Prisma.shopping_mall_sale_questionsCreateInput;
  }
}
