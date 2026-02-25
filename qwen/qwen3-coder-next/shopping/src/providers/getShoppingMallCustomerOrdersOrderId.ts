import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import { IShoppingMallOrderStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusLog";
import { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerOrdersOrderId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrder> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
      shopping_mall_shipping_address_id: true,
      total_price: true,
      status: true,
      created_at: true,
      customer: {
        select: {
          id: true,
          email: true,
          display_name: true,
          phone_number: true,
          email_verified: true,
          created_at: true,
          updated_at: true,
        },
      },
      shippingAddress: {
        select: {
          id: true,
          recipient_name: true,
          phone_number: true,
          street_address: true,
          city: true,
          state: true,
          postal_code: true,
          country: true,
          is_default: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      orderItems: {
        select: {
          id: true,
          quantity: true,
          unit_price: true,
          total_price: true,
          item_status: true,
          original_product_name: true,
          original_variant_options: true,
          created_at: true,
          order: {
            select: {
              id: true,
              total_price: true,
              status: true,
              created_at: true,
            },
          },
          productSnapshot: {
            select: {
              id: true,
              name: true,
              description: true,
              base_price: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  parent_category_id: true,
                },
              },
              product: {
                select: {
                  id: true,
                  name: true,
                  base_price: true,
                  is_deleted: true,
                  seller: {
                    select: {
                      id: true,
                      shop_name: true,
                      approval_status: true,
                      created_at: true,
                    },
                  },
                  category: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      parent_category_id: true,
                    },
                  },
                },
              },
            },
          },
          variantSnapshot: {
            select: {
              id: true,
              product_snapshot_id: true,
              sku_code: true,
              variant_price_override: true,
              stock_quantity: true,
              is_in_stock: true,
            },
          },
          sellerProfileSnapshot: {
            select: {
              id: true,
              shop_name: true,
              logo_image_url: true,
              approval_status: true,
            },
          },
        },
      },
      shipments: {
        select: {
          id: true,
          tracking_number: true,
          tracking_carrier: true,
          status: true,
          shipped_at: true,
          customer_confirmed_at: true,
          auto_confirmed_at: true,
          cancelled_at: true,
        },
      },
      orderStatusLogs: {
        select: {
          id: true,
          from_status: true,
          to_status: true,
          notes: true,
          customer: {
            select: {
              id: true,
              email: true,
              display_name: true,
              phone_number: true,
              email_verified: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      },
    },
  });
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: order.id,
    shopping_mall_customer_id: order.shopping_mall_customer_id,
    shopping_mall_shipping_address_id: order.shopping_mall_shipping_address_id,
    total_price: order.total_price,
    status: typia.assert<
      | "shipped"
      | "delivered"
      | "cancelled"
      | "paid"
      | "refunded"
      | "partially_completed"
    >(order.status),
    created_at: toISOStringSafe(order.created_at),
    customer: {
      id: order.customer.id,
      email: order.customer.email,
      display_name: order.customer.display_name ?? null,
      phone_number: order.customer.phone_number ?? null,
      email_verified: order.customer.email_verified,
      created_at: toISOStringSafe(order.customer.created_at),
      updated_at: toISOStringSafe(order.customer.updated_at),
    } satisfies IShoppingMallCustomer.ISummary,
    shippingAddress: {
      id: order.shippingAddress.id,
      customer: {
        id: order.customer.id,
        email: order.customer.email,
        display_name: order.customer.display_name ?? null,
        phone_number: order.customer.phone_number ?? null,
        email_verified: order.customer.email_verified,
        created_at: toISOStringSafe(order.customer.created_at),
        updated_at: toISOStringSafe(order.customer.updated_at),
      } satisfies IShoppingMallCustomer.ISummary,
      recipientName: order.shippingAddress.recipient_name,
      phoneNumber: order.shippingAddress.phone_number,
      streetAddress: order.shippingAddress.street_address,
      city: order.shippingAddress.city,
      state: order.shippingAddress.state,
      postalCode: order.shippingAddress.postal_code,
      country: order.shippingAddress.country,
      isDefault: order.shippingAddress.is_default,
      createdAt: toISOStringSafe(order.shippingAddress.created_at),
      updatedAt: toISOStringSafe(order.shippingAddress.updated_at),
      deletedAt: order.shippingAddress.deleted_at
        ? toISOStringSafe(order.shippingAddress.deleted_at)
        : null,
    },
    orderItems: order.orderItems.map((item) => ({
      id: item.id,
      order: {
        id: item.order.id,
        total_price: item.order.total_price,
        status: item.order.status,
        created_at: toISOStringSafe(item.order.created_at),
      } satisfies IShoppingMallOrder.ISummary,
      productSnapshot: {
        id: item.productSnapshot.id,
        name: item.productSnapshot.name,
        description: item.productSnapshot.description,
        base_price: item.productSnapshot.base_price,
        category: {
          id: item.productSnapshot.category.id,
          name: item.productSnapshot.category.name,
          description: item.productSnapshot.category.description ?? null,
          parent: item.productSnapshot.category.parent_category_id
            ? ({
                id: item.productSnapshot.category.parent_category_id,
                name: "",
                description: null,
                parent: null,
                subcategory_count: 0,
              } satisfies IShoppingMallCategory.ISummary)
            : null,
        } satisfies IShoppingMallCategory.ISummary,
        product: {
          id: item.productSnapshot.product.id,
          name: item.productSnapshot.product.name,
          base_price: item.productSnapshot.product.base_price,
          is_deleted: item.productSnapshot.product.is_deleted,
          seller: {
            id: item.productSnapshot.product.seller.id,
            shop_name: item.productSnapshot.product.seller.shop_name,
            approval_status:
              item.productSnapshot.product.seller.approval_status,
            created_at: toISOStringSafe(
              item.productSnapshot.product.seller.created_at,
            ),
          } satisfies IShoppingMallSeller.ISummary,
          category: {
            id: item.productSnapshot.product.category.id,
            name: item.productSnapshot.product.category.name,
            description:
              item.productSnapshot.product.category.description ?? null,
            parent: item.productSnapshot.product.category.parent_category_id
              ? ({
                  id: item.productSnapshot.product.category.parent_category_id,
                  name: "",
                  description: null,
                  parent: null,
                  subcategory_count: 0,
                } satisfies IShoppingMallCategory.ISummary)
              : null,
          } satisfies IShoppingMallCategory.ISummary,
          average_rating: 0,
        } satisfies IShoppingMallProduct.ISummary,
      } satisfies IShoppingMallOrderProductSnapshots.ISummary,
      variantSnapshot: {
        id: item.variantSnapshot.id,
        product_snapshot_id: item.variantSnapshot.product_snapshot_id,
        sku_code: item.variantSnapshot.sku_code,
        variant_price_override:
          item.variantSnapshot.variant_price_override ?? null,
        stock_quantity: item.variantSnapshot.stock_quantity,
        is_in_stock: item.variantSnapshot.is_in_stock,
      } satisfies IShoppingMallOrderVariantSnapshots.ISummary,
      sellerProfileSnapshot: {
        id: item.sellerProfileSnapshot.id,
        shop_name: item.sellerProfileSnapshot.shop_name,
        logo_image_url: item.sellerProfileSnapshot.logo_image_url ?? null,
        approval_status: item.sellerProfileSnapshot.approval_status,
      } satisfies IShoppingMallOrderSellerProfileSnapshots.ISummary,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.total_price,
      itemStatus: item.item_status,
      originalProductName: item.original_product_name,
      originalVariantOptions: item.original_variant_options,
      createdAt: toISOStringSafe(item.created_at),
    })),
    shipments: order.shipments.map((shipment) => ({
      id: shipment.id,
      tracking_number: shipment.tracking_number,
      tracking_carrier: shipment.tracking_carrier,
      status: shipment.status,
      shipped_at: toISOStringSafe(shipment.shipped_at),
      customer_confirmed_at: shipment.customer_confirmed_at
        ? toISOStringSafe(shipment.customer_confirmed_at)
        : null,
      auto_confirmed_at: shipment.auto_confirmed_at
        ? toISOStringSafe(shipment.auto_confirmed_at)
        : null,
      cancelled_at: shipment.cancelled_at
        ? toISOStringSafe(shipment.cancelled_at)
        : null,
    })),
    orderStatusLogs: order.orderStatusLogs.map((log) => ({
      id: log.id,
      previous_status: log.from_status ?? "",
      new_status: log.to_status,
      reason: log.notes ?? "",
      changed_by: log.customer
        ? ({
            id: log.customer.id,
            email: log.customer.email,
            display_name: log.customer.display_name ?? null,
            phone_number: log.customer.phone_number ?? null,
            email_verified: log.customer.email_verified,
            created_at: toISOStringSafe(log.customer.created_at),
            updated_at: toISOStringSafe(log.customer.updated_at),
          } satisfies IShoppingMallCustomer.ISummary)
        : null,
    })),
  };
}
