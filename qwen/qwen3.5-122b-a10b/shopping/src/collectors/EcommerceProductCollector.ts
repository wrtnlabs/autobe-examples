import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { EcommerceProductImageCollector } from "./EcommerceProductImageCollector";
import { EcommerceProductVariantCollector } from "./EcommerceProductVariantCollector";

export namespace EcommerceProductCollector {
  export async function collect(props: {
    body: IEcommerceProduct.ICreate;
    ecommerceSellers: IEntity;
    ecommerceSellerSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description,
      base_price: props.body.base_price,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      seller: { connect: { id: props.ecommerceSellers.id } },
      category: { connect: { id: props.body.category_id } },
      variants:
        props.body.variants && props.body.variants.length > 0
          ? {
              create: await ArrayUtil.asyncMap(props.body.variants, (variant) =>
                EcommerceProductVariantCollector.collect({
                  body: variant,
                  ecommerceProducts: { id },
                }),
              ),
            }
          : undefined,
      productImages:
        props.body.images && props.body.images.length > 0
          ? {
              create: await ArrayUtil.asyncMap(props.body.images, (image, i) =>
                EcommerceProductImageCollector.collect({
                  body: image,
                  ecommerceProducts: { id },
                  ecommerceSellers: props.ecommerceSellers,
                  ecommerceSellerSessions: props.ecommerceSellerSessions,
                }),
              ),
            }
          : undefined,
    } satisfies Prisma.ecommerce_productsCreateInput;
  }
}
