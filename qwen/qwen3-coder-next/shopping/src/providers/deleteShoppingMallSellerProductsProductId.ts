import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string;
}): Promise<void> {
  // Verify the product exists and belongs to the seller
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  // Get all variant IDs first
  const variants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: {
        shopping_mall_product_id: props.productId,
      },
      select: {
        id: true,
      },
    });
  const variantIds = variants.map((v) => v.id);
  // Get all variant snapshot IDs
  const variantSnapshots =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findMany({
      where: {
        shopping_mall_product_variant_id: {
          in: variantIds,
        },
      },
      select: {
        id: true,
      },
    });
  const variantSnapshotIds = variantSnapshots.map((v) => v.id);
  // Check if product has pending order items (paid or shipped status)
  const hasPendingOrders =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        shopping_mall_product_variant_id: {
          in: variantIds,
        },
        status: {
          in: ["paid", "shipped"],
        },
      },
    });
  if (hasPendingOrders) {
    throw new HttpException(
      "Product has pending orders and cannot be deleted",
      400,
    );
  }
  // Check if product has pending cancellation requests
  const hasPendingCancellation =
    await MyGlobal.prisma.shopping_mall_order_cancellation_requests.findFirst({
      where: {
        order_item_id: {
          in: await MyGlobal.prisma.shopping_mall_order_items
            .findMany({
              where: {
                shopping_mall_product_variant_id: {
                  in: variantIds,
                },
              },
              select: {
                id: true,
              },
            })
            .then((items) => items.map((i) => i.id)),
        },
      },
      status: "pending",
    });
}
if (hasPendingCancellation) {
  throw new HttpException("Product has pending cancellation requests", 400);
}
// Check if product has pending refund requests
const hasPendingRefund =
  await MyGlobal.prisma.shopping_mall_order_refund_requests.findFirst({
    where: {
      shopping_mall_order_item_id: {
        in: await MyGlobal.prisma.shopping_mall_order_items
          .findMany({
            where: {
              shopping_mall_product_variant_id: {
                in: variantIds,
              },
            },
            select: {
              id: true,
            },
          })
          .then((items) => items.map((i) => i.id)),
      },
    },
    status: "pending",
  });
if (hasPendingRefund) {
  throw new HttpException("Product has pending refund requests", 400);
}
// Delete product images
await MyGlobal.prisma.shopping_mall_product_images.deleteMany({
  where: {
    shopping_mall_product_id: props.productId,
  },
});
// Delete inventory records
await MyGlobal.prisma.shopping_mall_inventory_histories.deleteMany({
  where: {
    shopping_mall_product_variant_id: {
      in: variantIds,
    },
  },
});
// Delete variant option values
await MyGlobal.prisma.shopping_mall_product_variant_option_values.deleteMany({
  where: {
    shopping_mall_product_variant_id: {
      in: variantIds,
    },
  },
});
// Delete variant snapshots
await MyGlobal.prisma.shopping_mall_product_variant_snapshots.deleteMany({
  where: {
    id: {
      in: variantSnapshotIds,
    },
  },
});
// Delete variants
await MyGlobal.prisma.shopping_mall_product_variants.deleteMany({
  where: {
    shopping_mall_product_id: props.productId,
  },
});
// Delete from customer wishlists
await MyGlobal.prisma.shopping_mall_customer_wishlists.deleteMany({
  where: {
    shopping_mall_product_id: props.productId,
  },
});
// Delete the product
await MyGlobal.prisma.shopping_mall_products.delete({
  where: {
    id: props.productId,
  },
});
