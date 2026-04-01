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
  }) {
    const id: string = v4();
    const now: Date = new Date();
    const slug: string =
      props.body.slug ?? generateSlugFromName(props.body.name);
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      base_price: props.body.base_price,
      slug,
      status: "active",
      created_at: now,
      updated_at: now,
      deleted_at: null,
      seller: { connect: { id: props.ecommerceMallSellers.id } },
      category: { connect: { id: props.body.category_id } },
      variants: undefined,
      images: undefined,
      productSnapshots: undefined,
      variantSnapshots: undefined,
      reviews: undefined,
      wishlistItems: undefined,
      entitySnapshots: undefined,
    } satisfies Prisma.ecommerce_mall_productsCreateInput;
  }
  function generateSlugFromName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[\s]+/g, "-")
      .replace(/[^[\w\-]/g, "")
      .replace(/\-+/g, "-")
      .replace(/^\-+|\-+$/g, "");
  }
}
