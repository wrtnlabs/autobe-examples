import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallOrderItemTransformer } from "../transformers/EcommerceMallOrderItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminItemsItemId(props: {
  superAdmin: SuperadminPayload;
  itemId: string;
  body: IEcommerceMallOrderItem.IUpdate;
}): Promise<IEcommerceMallOrderItem> {
  // Validate that body has status to update
  if (props.body.status === undefined) {
    throw new HttpException("Status is required for update", 400);
  }
  const targetStatus = props.body.status;
  // Find the order item with all related data
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        quantity: true,
        status: true,
        price_at_purchase: true,
        created_at: true,
        updated_at: true,
        ecommerce_mall_product_variant_id: true,
        order: {
          select: {
            id: true,
            order_number: true,
            total_price: true,
            status: true,
            created_at: true,
            customer: {
              select: {
                id: true,
                email: true,
                created_at: true,
                deleted_at: true,
              },
            },
          },
        } satisfies Prisma.ecommerce_mall_ordersDefaultArgs,
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
            product_images: {
              select: {
                id: true,
                image_url: true,
                display_order: true,
              },
            },
          },
        } satisfies Prisma.ecommerce_mall_productsDefaultArgs,
        variant: {
          select: {
            id: true,
            sku_code: true,
            price: true,
            created_at: true,
            updated_at: true,
            product_variant_options: {
              select: {
                id: true,
                option_name: true,
                option_value: true,
              },
            },
          },
        } satisfies Prisma.ecommerce_mall_product_variantsDefaultArgs,
        seller: {
          select: {
            id: true,
            email: true,
            approval_status: true,
            created_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.ecommerce_mall_sellersDefaultArgs,
      },
    });
  // Validate status transition
  const currentStatus = orderItem.status;
  if (targetStatus === "cancelled" && currentStatus !== "paid") {
    throw new HttpException("Only paid items can be cancelled", 400);
  }
  if (targetStatus === "refunded" && currentStatus !== "delivered") {
    throw new HttpException("Only delivered items can be refunded", 400);
  }
  const now = new Date();
  const nowISO = toISOStringSafe(now);
  // Execute transaction for atomic updates
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update order item status
    await tx.ecommerce_mall_order_items.update({
      where: { id: props.itemId },
      data: {
        status: targetStatus,
        updated_at: now,
      },
    });
    // Create inventory record for stock restoration (positive quantity_change)
    if (targetStatus === "cancelled" || targetStatus === "refunded") {
      await tx.ecommerce_mall_inventory_records.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          quantity_change: orderItem.quantity,
          created_at: now,
          variant: {
            connect: { id: orderItem.ecommerce_mall_product_variant_id },
          },
        },
      });
    }
    // Create order item snapshot for audit trail
    await tx.ecommerce_mall_order_item_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        quantity: orderItem.quantity,
        price_at_purchase: orderItem.price_at_purchase,
        status: targetStatus,
        created_at: now,
        order_item: { connect: { id: orderItem.id } },
      },
    });
    // Update parent order status based on item states
    const siblingItems = await tx.ecommerce_mall_order_items.findMany({
      where: { ecommerce_mall_order_id: orderItem.order.id },
      select: { id: true, status: true },
    });
    // Calculate new order status based on item statuses
    const itemStatuses = siblingItems.map((item) => item.status);
    const allCancelled = itemStatuses.every((s) => s === "cancelled");
    const allRefunded = itemStatuses.every((s) => s === "refunded");
    const allDelivered = itemStatuses.every((s) => s === "delivered");
    const anyShipped = itemStatuses.some((s) => s === "shipped");
    const anyDelivered = itemStatuses.some((s) => s === "delivered");
    let newOrderStatus: string;
    if (allCancelled) {
      newOrderStatus = "cancelled";
    } else if (allRefunded) {
      newOrderStatus = "refunded";
    } else if (allDelivered) {
      newOrderStatus = "delivered";
    } else if (anyShipped || anyDelivered) {
      newOrderStatus = "partially_completed";
    } else {
      newOrderStatus = "paid";
    }
    await tx.ecommerce_mall_orders.update({
      where: { id: orderItem.order.id },
      data: {
        status: newOrderStatus,
        updated_at: now,
      },
    });
    // Create order snapshot for audit trail
    await tx.ecommerce_mall_order_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        order_number: orderItem.order.order_number,
        total_price: orderItem.order.total_price,
        status: newOrderStatus,
        created_at: now,
        order: { connect: { id: orderItem.order.id } },
      },
    });
  });
  // Return updated order item using transformer
  const updatedRecord =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      ...EcommerceMallOrderItemTransformer.select(),
    });
  return await EcommerceMallOrderItemTransformer.transform(updatedRecord);
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
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSuperAdminItemsItemId(props: {
//   superAdmin: SuperadminPayload;
//   itemId: string;
//   body: IEcommerceMallOrderItem.IUpdate;
// }): Promise<IEcommerceMallOrderItem> {
//   const record = await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
//     ...EcommerceMallOrderItemTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallOrderItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------