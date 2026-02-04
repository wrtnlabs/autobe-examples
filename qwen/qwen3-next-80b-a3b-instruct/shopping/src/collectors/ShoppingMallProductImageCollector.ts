import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductImageCollector {
  export async function collect(props: {
    body: IShoppingMallProductImage.ICreate;
  }) {
    return {
      id: v4(),
      image_url: props.body.url,
      image_order: 0,
      created_at: new Date(),
      updated_at: new Date(),
      product: { connect: { id: "" } }, // This represents a design flaw in the API operation - product reference is required but not provided in DTO or context. In production, this will fail. This collector is only a placeholder until the API design is fixed to include product_id reference.
    } satisfies Prisma.shopping_mall_product_imagesCreateInput;
  }
}
