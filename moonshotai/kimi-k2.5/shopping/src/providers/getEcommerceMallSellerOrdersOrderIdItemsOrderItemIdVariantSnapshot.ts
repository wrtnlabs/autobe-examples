import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantSnapshotAtInvertTransformer } from "../transformers/EcommerceMallProductVariantSnapshotAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerOrdersOrderIdItemsOrderItemIdVariantSnapshot(props: {
  seller: SellerPayload;
  orderId: string;
  orderItemId: string;
}): Promise<IEcommerceMallProductVariantSnapshot.IInvert> {
  const orderItem = await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
    where: {
      id: props.orderItemId,
      order_id: props.orderId,
      seller_id: props.seller.id,
    },
    select: {
      id: true,
      quantity: true,
      price_at_purchase: true,
      status: true,
      created_at: true,
      product: {
        select: {
          id: true,
          name: true,
          description: true,
          base_price: true,
          created_at: true,
          category: {
            select: {
              id: true,
              name: true,
              description: true,
              parent_id: true,
              created_at: true,
              updated_at: true,
            },
          },
          seller: {
            select: {
              id: true,
              email: true,
              approval_status: true,
              created_at: true,
              deleted_at: true,
            },
          },
        },
      },
      variant: {
        select: {
          id: true,
          sku_code: true,
          price: true,
          created_at: true,
          updated_at: true,
          options: {
            select: {
              id: true,
              option_name: true,
              option_value: true,
            },
          },
        },
      },
      snapshot: {
        select: {
          variant_snapshot_id: true,
        },
      },
    },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found or access denied", 404);
  }
  if (orderItem.snapshot === null) {
    throw new HttpException(
      "Variant snapshot not found for this order item",
      404,
    );
  }
  const variantSnapshot =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findUniqueOrThrow(
      {
        where: {
          id: orderItem.snapshot.variant_snapshot_id,
        },
        ...EcommerceMallProductVariantSnapshotAtInvertTransformer.select(),
      },
    );
  const orderItemSummary: IEcommerceMallOrderItem.ISummary = {
    id: orderItem.id,
    quantity: orderItem.quantity,
    priceAtPurchase: orderItem.price_at_purchase,
    status: orderItem.status,
    createdAt: orderItem.created_at.toISOString(),
    product: {
      id: orderItem.product.id,
      name: orderItem.product.name,
      description: orderItem.product.description,
      basePrice: orderItem.product.base_price,
      thumbnailImage: null,
      priceRange: {
        minPrice: orderItem.product.base_price,
        maxPrice: orderItem.product.base_price,
      },
      category: {
        id: orderItem.product.category.id,
        name: orderItem.product.category.name,
        description: orderItem.product.category.description,
        parentId: orderItem.product.category.parent_id,
        subcategoryCount: 0,
        createdAt: orderItem.product.category.created_at.toISOString(),
        updatedAt: orderItem.product.category.updated_at.toISOString(),
      },
      seller: {
        id: orderItem.product.seller.id,
        email: orderItem.product.seller.email,
        approvalStatus: orderItem.product.seller.approval_status,
        createdAt: orderItem.product.seller.created_at.toISOString(),
        deletedAt: orderItem.product.seller.deleted_at?.toISOString() ?? null,
        registrationCount: 0,
        latestRegistrationStatus: null,
      },
      averageRating: null,
      reviewCount: 0,
      availabilityStatus: "available",
      createdAt: orderItem.product.created_at.toISOString(),
    },
    variant: {
      id: orderItem.variant.id,
      skuCode: orderItem.variant.sku_code,
      price: orderItem.variant.price,
      options: orderItem.variant.options.map((opt) => ({
        id: opt.id,
        optionName: opt.option_name,
        optionValue: opt.option_value,
      })),
      createdAt: orderItem.variant.created_at.toISOString(),
      updatedAt: orderItem.variant.updated_at.toISOString(),
    },
    seller: {
      id: orderItem.product.seller.id,
      email: orderItem.product.seller.email,
      approvalStatus: orderItem.product.seller.approval_status,
      createdAt: orderItem.product.seller.created_at.toISOString(),
      deletedAt: orderItem.product.seller.deleted_at?.toISOString() ?? null,
      registrationCount: 0,
      latestRegistrationStatus: null,
    },
  };
  return await EcommerceMallProductVariantSnapshotAtInvertTransformer.transform(
    variantSnapshot,
    orderItemSummary,
  );
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
// import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallSellerOrdersOrderIdItemsOrderItemIdVariantSnapshot(props: {
//   seller: SellerPayload;
//   orderId: string;
//   orderItemId: string;
// }): Promise<IEcommerceMallProductVariantSnapshot.IInvert> {
//   const record = await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findFirstOrThrow({
//     ...EcommerceMallProductVariantSnapshotAtInvertTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallProductVariantSnapshotAtInvertTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------