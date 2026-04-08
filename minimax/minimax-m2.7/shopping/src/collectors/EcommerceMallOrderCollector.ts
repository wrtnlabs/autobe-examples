import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallOrderCollector {
  export interface ICartItem {
    variantId: string;
    quantity: number;
    unitPrice: number;
    variantName: string;
    productName: string;
    productSnapshotImageUrl: string;
    productId?: string;
    productSnapshot?: {
      name: string;
      imageUrl: string;
      description?: string;
      basePrice?: number;
      categoryName?: string;
      sellerId?: string;
    };
    sellerProfileSnapshot?: {
      shop_name: string;
      sellerProfileId?: string;
    };
  }
  export async function collect(props: {
    body: IEcommerceMallOrder.ICreate;
    ecommerceMallCustomers: IEntity;
    ecommerceMallShippingAddresses: IEntity;
    cartItems: ICartItem[];
  }) {
    const id = v4();
    const now = new Date();
    // Calculate subtotal from cart items
    const subtotal = props.cartItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    // Calculate shipping cost: free shipping for orders >= 50000
    const totalQuantity = props.cartItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    const shipping_cost = subtotal >= 50000 ? 0 : totalQuantity * 3000;
    // Calculate total amount
    const total_amount = subtotal + shipping_cost;
    // Generate unique order number
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const order_number = `ORD-${timestamp}-${random}`;
    // Query products to get seller IDs - use seller_id (FK column), not seller relation
    const productIds = [
      ...new Set(
        props.cartItems
          .filter((item) => !item.productSnapshot?.sellerId && item.productId)
          .map((item) => item.productId!),
      ),
    ];
    const productSellerMap = new Map<string, string>();
    if (productIds.length > 0) {
      const products = await MyGlobal.prisma.ecommerce_mall_products.findMany({
        where: { id: { in: productIds } },
        select: { id: true, seller_id: true }, // Use seller_id FK column
      });
      products.forEach((p) => productSellerMap.set(p.id, p.seller_id));
    }
    // Query seller profiles to get profile IDs for sellers without profile ID
    const sellerIds = [
      ...new Set(
        props.cartItems
          .filter(
            (item) =>
              !item.sellerProfileSnapshot?.sellerProfileId &&
              (item.productSnapshot?.sellerId || item.productId),
          )
          .map(
            (item) =>
              item.productSnapshot?.sellerId ??
              productSellerMap.get(item.productId ?? "") ??
              "",
          )
          .filter(Boolean),
      ),
    ];
    const sellerProfileMap = new Map<string, string>();
    if (sellerIds.length > 0) {
      const profiles =
        await MyGlobal.prisma.ecommerce_mall_seller_profiles.findMany({
          where: { seller_id: { in: sellerIds } },
          select: { id: true, seller_id: true },
        });
      profiles.forEach((p) => sellerProfileMap.set(p.seller_id, p.id));
    }
    return {
      // Scalar fields
      id,
      order_number,
      subtotal,
      shipping_cost,
      total_amount,
      status: "paid",
      created_at: now,
      updated_at: now,
      deleted_at: null,
      // BelongsTo relations
      customer: {
        connect: { id: props.ecommerceMallCustomers.id },
      },
      shippingAddress: {
        connect: { id: props.ecommerceMallShippingAddresses.id },
      },
      // HasMany relations
      orderItems: {
        create: props.cartItems.map((item, index) => {
          // Determine seller ID - from props or query
          const sellerId: string | undefined =
            item.productSnapshot?.sellerId ??
            productSellerMap.get(item.productId ?? "");
          // Determine seller profile ID
          const sellerProfileId: string | undefined =
            item.sellerProfileSnapshot?.sellerProfileId ??
            (sellerId ? sellerProfileMap.get(sellerId) : undefined);
          return {
            id: v4(),
            sequence: index,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            variant_name: item.variantName,
            product_name: item.productName,
            product_snapshot_image_url: item.productSnapshotImageUrl,
            status: "pending",
            created_at: now,
            updated_at: now,
            product: {
              connect: { id: item.productId ?? item.variantId },
            },
            productVariant: {
              connect: { id: item.variantId },
            },
            productSnapshot: {
              create: {
                id: v4(),
                name: item.productSnapshot?.name ?? item.productName,
                image_url:
                  item.productSnapshot?.imageUrl ??
                  item.productSnapshotImageUrl,
                description:
                  item.productSnapshot?.description ?? item.productName,
                base_price: item.productSnapshot?.basePrice ?? item.unitPrice,
                category_name: item.productSnapshot?.categoryName ?? "General",
                product: {
                  connect: { id: item.productId ?? item.variantId },
                },
                // seller is required - always include with validated ID
                seller: sellerId
                  ? { connect: { id: sellerId } }
                  : {
                      connect: {
                        id: productSellerMap.get(item.productId ?? "") ?? "",
                      },
                    },
                created_at: now,
                updated_at: now,
              },
            },
            sellerProfileSnapshot: {
              create: {
                id: v4(),
                shop_name:
                  item.sellerProfileSnapshot?.shop_name ?? "Unknown Seller",
                // sellerProfile is optional - use undefined if not available
                sellerProfile: sellerProfileId
                  ? { connect: { id: sellerProfileId } }
                  : undefined,
                created_at: now,
                updated_at: now,
              },
            },
          };
        }),
      },
      // shipments: not created at order time
    } satisfies Prisma.ecommerce_mall_ordersCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallOrderCollector {
//         export async function collect(props: {
//           body: IEcommerceMallOrder.ICreate;
//           ecommerceMallCustomers: IEntity; // from authorized actor
// ecommerceMallShippingAddresses: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       order_number: ...,
//       subtotal: ...,
//       shipping_cost: ...,
//       total_amount: ...,
//       status: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       customer: ...,
//       shippingAddress: ...,
//       orderItems: ...,
//       shipments: ...,
//           } satisfies Prisma.ecommerce_mall_ordersCreateInput;
//         }
//       }
//--------------------------------------------------------------