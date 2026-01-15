import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IProductVariantAttributes } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductVariantAttributes";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallProductVariantCollector {
  export async function collect(props: {
    body: IShoppingMallProductVariant.ICreate;
    product: IEntity;
  }) {
    return {
      id: v4(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      product: {
        connect: { id: props.product.id },
      },
      shopping_mall_product_variant_attributes: {
        create: Object.entries(props.body.attributes).map(
          ([attrName, attrId]) => ({
            id: v4(),
            attributeValue: {
              connect: { id: attrId },
            },
          }),
        ),
      },
      shopping_mall_product_variant_inventory: {
        create: {
          id: v4(),
          created_at: new Date(),
          updated_at: new Date(),
          quantity: props.body.quantity,
        },
      },
      shopping_mall_product_variant_pricing: {
        create: {
          id: v4(),
          created_at: new Date(),
          updated_at: new Date(),
          price: props.body.price,
        },
      },
      shopping_mall_variant_skus: {
        create: {
          id: v4(),
          created_at: new Date(),
          updated_at: new Date(),
          sku: props.body.attributes.substring(0, 100),
        },
      },
      shopping_mall_variant_inventory: {
        create: {
          id: v4(),
          created_at: new Date(),
          updated_at: new Date(),
          quantity: props.body.quantity,
        },
      },
      shopping_mall_variant_pricing: {
        create: {
          id: v4(),
          created_at: new Date(),
          updated_at: new Date(),
          price: props.body.price,
        },
      },
    } satisfies Prisma.shopping_mall_product_variantsCreateInput;
  }
}
