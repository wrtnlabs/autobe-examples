import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSpecification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSaleSpecificationCollector {
  export async function collect(props: {
    body: {
      specification_key: string;
      specification_value: string;
      shoppingMallSaleId: string;
    };
  }) {
    const id: string = v4();
    return {
      id,
      specification_key: props.body.specification_key,
      specification_value: props.body.specification_value,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      shoppingMallSale: { connect: { id: props.body.shoppingMallSaleId } },
    } satisfies Prisma.shopping_mall_sale_specificationsCreateInput;
  }
}
