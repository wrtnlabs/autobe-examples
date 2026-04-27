import { IECommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCartItem";
import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ECommerceMallCustomerAtSummaryTransformer } from "./ECommerceMallCustomerAtSummaryTransformer";
import { ECommerceMallProductVariantTransformer } from "./ECommerceMallProductVariantTransformer";

export namespace ECommerceMallCartItemTransformer {
  export type Payload = Prisma.e_commerce_mall_cart_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: ECommerceMallCustomerAtSummaryTransformer.select(),
        productVariant: {
          select: {
            ...ECommerceMallProductVariantTransformer.select().select,
            product: {
              select: {
                base_price: true,
              },
            } satisfies Prisma.e_commerce_mall_productsFindManyArgs,
          },
        } satisfies Prisma.e_commerce_mall_product_variantsFindManyArgs,
      },
    } satisfies Prisma.e_commerce_mall_cart_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IECommerceMallCartItem> {
    const unitPrice =
      input.productVariant.price ??
      input.productVariant.product.base_price ??
      0;
    const stock = input.productVariant.inventoryRecords.reduce(
      (sum, r) => sum + r.quantity_change,
      0,
    );
    const productVariant =
      await ECommerceMallProductVariantTransformer.transform(
        input.productVariant,
      );
    return {
      id: input.id,
      quantity: input.quantity,
      unit_price: unitPrice,
      subtotal: unitPrice * input.quantity,
      is_available: input.productVariant.deleted_at === null && stock > 0,
      customer: await ECommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      productVariant,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IECommerceMallCartItem;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ECommerceMallCartItemTransformer {
//       export type Payload = Prisma.e_commerce_mall_cart_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             quantity: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             customer: ECommerceMallCustomerAtSummaryTransformer.select(),
//             e_commerce_mall_product_variant_id: true,
//             ...
//           },
//         } satisfies Prisma.e_commerce_mall_cart_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IECommerceMallCartItem> {
//         return {
//   id: {string},
//   quantity: {integer},
//   unit_price: {number},
//   subtotal: {number},
//   is_available: {boolean},
//   customer: await ECommerceMallCustomerAtSummaryTransformer.transform(input.customer),
//   productVariant: {IECommerceMallProductVariant},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------