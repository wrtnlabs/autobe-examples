import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallProductCollector {
  export async function collect(props: {
    body: IEcommerceMallProduct.ICreate;
    ecommerceMallSellers: IEntity;
    ecommerceMallSellerSessions: IEntity;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      description: props.body.description,
      base_price: props.body.base_price,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      seller: { connect: { id: props.ecommerceMallSellers.id } },
      category: { connect: { id: props.body.category_id } },
    } satisfies Prisma.ecommerce_mall_productsCreateInput;
  }
}
