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
    const id: string = v4();
    // Auto-generate slug from name if not provided
    const slug =
      props.body.slug ??
      props.body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      base_price: props.body.base_price,
      slug,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      seller: { connect: { id: props.ecommerceMallSellers.id } },
      category: { connect: { id: props.body.category_id } },
    } satisfies Prisma.ecommerce_mall_productsCreateInput;
  }
}
