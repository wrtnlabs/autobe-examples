import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { EcommerceMallProductVariantCollector } from "./EcommerceMallProductVariantCollector";

export namespace EcommerceMallProductCollector {
  export async function collect(props: {
    body: IEcommerceMallProduct.ICreate;
    ecommerceMallSellers: IEntity; // from authorized actor
    ecommerceMallCategories: IEntity; // from path parameter categoryId
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description,
      base_price: props.body.base_price,
      is_available: props.body.is_available ?? false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      seller: { connect: { id: props.ecommerceMallSellers.id } },
      category: { connect: { id: props.ecommerceMallCategories.id } },
      wishlistItems: undefined,
      reviews: undefined,
      deletionRequests: undefined,
      orderItems: undefined,
      images: props.body.images?.length
        ? {
            create: await ArrayUtil.asyncMap(
              props.body.images,
              async (image) => ({
                id: v4(),
                image_url: image.files[0],
                sort_order: 0,
                is_main: false,
                created_at: new Date(),
                updated_at: new Date(),
                deleted_at: null,
                product: { connect: { id } },
              }),
            ),
          }
        : undefined,
      variants: props.body.variants?.length
        ? {
            create: await ArrayUtil.asyncMap(
              props.body.variants,
              (variant, i) =>
                EcommerceMallProductVariantCollector.collect({
                  body: variant,
                  product: { id },
                }),
            ),
          }
        : undefined,
    } satisfies Prisma.ecommerce_mall_productsCreateInput;
  }
}
