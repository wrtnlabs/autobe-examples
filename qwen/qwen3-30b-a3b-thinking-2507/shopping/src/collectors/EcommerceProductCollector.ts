import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceProductCollector {
  export async function collect(props: { body: IEcommerceProduct.ICreate }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description,
      base_price: props.body.basePrice,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      category: { connect: { id: props.body.categoriesId } },
    } satisfies Prisma.ecommerce_productsCreateInput;
  }
}
