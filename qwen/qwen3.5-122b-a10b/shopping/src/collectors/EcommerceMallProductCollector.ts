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
    seller: IEntity;
    session: IEntity;
  }) {
    const id: string = crypto.randomUUID();
    return {
      id,
      name: props.body.name,
      description: props.body.description,
      base_price: props.body.base_price,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      seller: { connect: { id: props.seller.id } },
      category: { connect: { id: props.body.category_id } },
      variants: undefined,
      images: undefined,
      productSnapshots: undefined,
      reviews: undefined,
      wishlistEntries: undefined,
    } satisfies Prisma.ecommerce_mall_productsCreateInput;
  }
}
