import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorOrderItemsOrderItemIdSnapshots(props: {
  administrator: AdministratorPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItemSnapshot.IRequest;
}): Promise<IPageIShoppingMallOrderItemSnapshot.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        shopping_mall_order_id: true,
        shopping_mall_product_variant_id: true,
        quantity: true,
        status: true,
        shipped_at: true,
        delivered_at: true,
        cancelled_at: true,
        refunded_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order: {
          select: {
            id: true,
            shopping_mall_customer_id: true,
          },
        },
        productVariant: {
          select: {
            id: true,
            shopping_mall_product_id: true,
            sku_code: true,
            override_price: true,
            stock_quantity: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  if (props.administrator.type !== "administrator") {
    throw new HttpException("Forbidden", 403);
  }
  const whereInput = {
    shopping_mall_order_item_id: props.orderItemId,
    ...(props.body.search === undefined
      ? {}
      : {
          OR: [
            {
              product_name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              product_description: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              variant_sku: { contains: props.body.search, mode: "insensitive" },
            },
            {
              variant_option_values: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              seller_shop_name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              seller_shop_description: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }),
  } satisfies Prisma.shopping_mall_order_item_snapshotsWhereInput;
  const snapshots =
    await MyGlobal.prisma.shopping_mall_order_item_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: [{ created_at: "asc" }, { id: "asc" }],
      select: {
        id: true,
        shopping_mall_order_item_id: true,
        product_name: true,
        product_description: true,
        variant_sku: true,
        variant_option_values: true,
        seller_shop_name: true,
        seller_shop_description: true,
        seller_logo_image: true,
        quantity: true,
        unit_price: true,
        total_price: true,
        created_at: true,
        orderItem: {
          select: {
            id: true,
            shopping_mall_order_id: true,
            shopping_mall_product_variant_id: true,
            quantity: true,
            status: true,
            shipped_at: true,
            delivered_at: true,
            cancelled_at: true,
            refunded_at: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            order: {
              select: {
                id: true,
                order_number: true,
                status: true,
                subtotal_amount: true,
                shipping_fee_amount: true,
                discount_amount: true,
                total_amount: true,
                placed_at: true,
                paid_at: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                customer: {
                  select: {
                    id: true,
                    email: true,
                    account_status: true,
                    banned_at: true,
                    deleted_at: true,
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
                    state_province: true,
                    postal_code: true,
                    country: true,
                    is_default: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
              },
            },
            productVariant: {
              select: {
                id: true,
                sku_code: true,
                override_price: true,
                stock_quantity: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
      },
    });
  const total = await MyGlobal.prisma.shopping_mall_order_item_snapshots.count({
    where: whereInput,
  });
  return {
    data: snapshots.map((snapshot) => ({
      id: snapshot.id,
      orderItem: {
        id: snapshot.orderItem.id,
        order: {
          id: snapshot.orderItem.order.id,
          order_number: snapshot.orderItem.order.order_number,
          status: snapshot.orderItem.order.status,
          subtotal_amount: snapshot.orderItem.order.subtotal_amount,
          shipping_fee_amount: snapshot.orderItem.order.shipping_fee_amount,
          discount_amount: snapshot.orderItem.order.discount_amount,
          total_amount: snapshot.orderItem.order.total_amount,
          placed_at: toISOStringSafe(snapshot.orderItem.order.placed_at),
          paid_at:
            snapshot.orderItem.order.paid_at === null
              ? null
              : toISOStringSafe(snapshot.orderItem.order.paid_at),
          created_at: toISOStringSafe(snapshot.orderItem.order.created_at),
          updated_at: toISOStringSafe(snapshot.orderItem.order.updated_at),
          deleted_at:
            snapshot.orderItem.order.deleted_at === null
              ? null
              : toISOStringSafe(snapshot.orderItem.order.deleted_at),
          customer: {
            id: snapshot.orderItem.order.customer.id,
            email: snapshot.orderItem.order.customer.email,
            accountStatus: snapshot.orderItem.order.customer.account_status,
            bannedAt:
              snapshot.orderItem.order.customer.banned_at === null
                ? null
                : toISOStringSafe(snapshot.orderItem.order.customer.banned_at),
            deletedAt:
              snapshot.orderItem.order.customer.deleted_at === null
                ? null
                : toISOStringSafe(snapshot.orderItem.order.customer.deleted_at),
            createdAt: toISOStringSafe(
              snapshot.orderItem.order.customer.created_at,
            ),
            updatedAt: toISOStringSafe(
              snapshot.orderItem.order.customer.updated_at,
            ),
          },
          shippingAddress:
            snapshot.orderItem.order.shippingAddress === null
              ? null
              : {
                  id: snapshot.orderItem.order.shippingAddress.id,
                  recipientName:
                    snapshot.orderItem.order.shippingAddress.recipient_name,
                  phoneNumber:
                    snapshot.orderItem.order.shippingAddress.phone_number,
                  streetAddress:
                    snapshot.orderItem.order.shippingAddress.street_address,
                  city: snapshot.orderItem.order.shippingAddress.city,
                  stateProvince:
                    snapshot.orderItem.order.shippingAddress.state_province,
                  postalCode:
                    snapshot.orderItem.order.shippingAddress.postal_code,
                  country: snapshot.orderItem.order.shippingAddress.country,
                  isDefault:
                    snapshot.orderItem.order.shippingAddress.is_default,
                  customerProfile: {
                    id: snapshot.orderItem.order.customer.id,
                    customer: {
                      id: snapshot.orderItem.order.customer.id,
                      email: snapshot.orderItem.order.customer.email,
                      accountStatus:
                        snapshot.orderItem.order.customer.account_status,
                      bannedAt:
                        snapshot.orderItem.order.customer.banned_at === null
                          ? null
                          : toISOStringSafe(
                              snapshot.orderItem.order.customer.banned_at,
                            ),
                      deletedAt:
                        snapshot.orderItem.order.customer.deleted_at === null
                          ? null
                          : toISOStringSafe(
                              snapshot.orderItem.order.customer.deleted_at,
                            ),
                      createdAt: toISOStringSafe(
                        snapshot.orderItem.order.customer.created_at,
                      ),
                      updatedAt: toISOStringSafe(
                        snapshot.orderItem.order.customer.updated_at,
                      ),
                    },
                  },
                  createdAt: toISOStringSafe(
                    snapshot.orderItem.order.shippingAddress.created_at,
                  ),
                  updatedAt: toISOStringSafe(
                    snapshot.orderItem.order.shippingAddress.updated_at,
                  ),
                  deletedAt:
                    snapshot.orderItem.order.shippingAddress.deleted_at === null
                      ? null
                      : toISOStringSafe(
                          snapshot.orderItem.order.shippingAddress.deleted_at,
                        ),
                },
        },
        productVariant: {
          id: snapshot.orderItem.productVariant.id,
          skuCode: snapshot.orderItem.productVariant.sku_code,
          overridePrice: snapshot.orderItem.productVariant.override_price,
          stockQuantity: snapshot.orderItem.productVariant.stock_quantity,
          createdAt: toISOStringSafe(
            snapshot.orderItem.productVariant.created_at,
          ),
          updatedAt: toISOStringSafe(
            snapshot.orderItem.productVariant.updated_at,
          ),
          deletedAt:
            snapshot.orderItem.productVariant.deleted_at === null
              ? null
              : toISOStringSafe(snapshot.orderItem.productVariant.deleted_at),
        },
        quantity: snapshot.orderItem.quantity,
        status: snapshot.orderItem.status,
        shippedAt:
          snapshot.orderItem.shipped_at === null
            ? null
            : toISOStringSafe(snapshot.orderItem.shipped_at),
        deliveredAt:
          snapshot.orderItem.delivered_at === null
            ? null
            : toISOStringSafe(snapshot.orderItem.delivered_at),
        cancelledAt:
          snapshot.orderItem.cancelled_at === null
            ? null
            : toISOStringSafe(snapshot.orderItem.cancelled_at),
        refundedAt:
          snapshot.orderItem.refunded_at === null
            ? null
            : toISOStringSafe(snapshot.orderItem.refunded_at),
        createdAt: toISOStringSafe(snapshot.orderItem.created_at),
        updatedAt: toISOStringSafe(snapshot.orderItem.updated_at),
        deletedAt:
          snapshot.orderItem.deleted_at === null
            ? null
            : toISOStringSafe(snapshot.orderItem.deleted_at),
      },
      productName: snapshot.product_name,
      productDescription: snapshot.product_description,
      variantSku: snapshot.variant_sku,
      variantOptionValues: snapshot.variant_option_values,
      sellerShopName: snapshot.seller_shop_name,
      sellerShopDescription: snapshot.seller_shop_description,
      sellerLogoImage: snapshot.seller_logo_image,
      quantity: snapshot.quantity,
      unitPrice: snapshot.unit_price,
      totalPrice: snapshot.total_price,
      createdAt: toISOStringSafe(snapshot.created_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
