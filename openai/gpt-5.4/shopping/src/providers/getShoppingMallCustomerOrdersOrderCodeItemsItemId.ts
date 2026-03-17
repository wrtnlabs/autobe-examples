import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddressSnapshot";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductPurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshot";
import { IShoppingMallProductPurchaseSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPurchaseSnapshotOptionValue";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfilePurchaseSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfilePurchaseSnapshot";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallTrackingInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallTrackingInfo";
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

export async function getShoppingMallCustomerOrdersOrderCodeItemsItemId(props: {
  customer: CustomerPayload;
  orderCode: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItem> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { code: props.orderCode },
    select: {
      id: true,
      code: true,
      status: true,
      total_price: true,
      shopping_mall_customer_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      customer: {
        select: {
          id: true,
          email: true,
          banned_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      } satisfies Prisma.shopping_mall_customersFindManyArgs,
      paymentAttempt: {
        select: {
          id: true,
          status: true,
          amount: true,
          gateway_provider: true,
          gateway_reference: true,
          failure_reason: true,
          processed_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      } satisfies Prisma.shopping_mall_payment_attemptsFindManyArgs,
      addressSnapshot: {
        select: {
          id: true,
          recipient_name: true,
          phone_number: true,
          street_address: true,
          city: true,
          state_province: true,
          postal_code: true,
          country: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      } satisfies Prisma.shopping_mall_order_address_snapshotsFindManyArgs,
    },
  });
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const item = await MyGlobal.prisma.shopping_mall_order_items.findFirstOrThrow(
    {
      where: {
        id: props.itemId,
        shopping_mall_order_id: order.id,
      },
      select: {
        id: true,
        quantity: true,
        unit_price: true,
        status: true,
        delivered_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        order: {
          select: {
            id: true,
            code: true,
            status: true,
            total_price: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            customer: {
              select: {
                id: true,
                email: true,
                banned_at: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            } satisfies Prisma.shopping_mall_customersFindManyArgs,
            paymentAttempt: {
              select: {
                id: true,
                status: true,
                amount: true,
                gateway_provider: true,
                gateway_reference: true,
                failure_reason: true,
                processed_at: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            } satisfies Prisma.shopping_mall_payment_attemptsFindManyArgs,
            addressSnapshot: {
              select: {
                id: true,
                recipient_name: true,
                phone_number: true,
                street_address: true,
                city: true,
                state_province: true,
                postal_code: true,
                country: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            } satisfies Prisma.shopping_mall_order_address_snapshotsFindManyArgs,
          },
        } satisfies Prisma.shopping_mall_ordersFindManyArgs,
        seller: {
          select: {
            id: true,
            email: true,
            approval_status: true,
            rejection_reason: true,
            suspended: true,
            banned: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.shopping_mall_sellersFindManyArgs,
        productVariant: {
          select: {
            id: true,
            sku_code: true,
            option_summary: true,
            price: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                base_price: true,
                status: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                seller: {
                  select: {
                    id: true,
                    email: true,
                    approval_status: true,
                    rejection_reason: true,
                    suspended: true,
                    banned: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                } satisfies Prisma.shopping_mall_sellersFindManyArgs,
                category: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                    parent: {
                      select: {
                        id: true,
                        name: true,
                        description: true,
                        created_at: true,
                        updated_at: true,
                        deleted_at: true,
                      },
                    } satisfies Prisma.shopping_mall_categoriesFindManyArgs,
                  },
                } satisfies Prisma.shopping_mall_categoriesFindManyArgs,
              },
            } satisfies Prisma.shopping_mall_productsFindManyArgs,
          },
        } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
        shipment: {
          select: {
            id: true,
            shipped_at: true,
            delivered_at: true,
            auto_deliver_at: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            order: {
              select: {
                id: true,
                code: true,
                status: true,
                total_price: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            } satisfies Prisma.shopping_mall_ordersFindManyArgs,
            seller: {
              select: {
                id: true,
                email: true,
                approval_status: true,
                rejection_reason: true,
                suspended: true,
                banned: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            } satisfies Prisma.shopping_mall_sellersFindManyArgs,
            trackingInfo: {
              select: {
                id: true,
                carrier_name: true,
                tracking_number: true,
                tracking_url: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            } satisfies Prisma.shopping_mall_tracking_infosFindManyArgs,
          },
        } satisfies Prisma.shopping_mall_shipmentsFindManyArgs,
        productPurchaseSnapshot: {
          select: {
            id: true,
            product_name: true,
            product_description: true,
            sku_code: true,
            unit_price: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                base_price: true,
                status: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                seller: {
                  select: {
                    id: true,
                    email: true,
                    approval_status: true,
                    rejection_reason: true,
                    suspended: true,
                    banned: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                } satisfies Prisma.shopping_mall_sellersFindManyArgs,
                category: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                    parent: {
                      select: {
                        id: true,
                        name: true,
                        description: true,
                        created_at: true,
                        updated_at: true,
                        deleted_at: true,
                      },
                    } satisfies Prisma.shopping_mall_categoriesFindManyArgs,
                  },
                } satisfies Prisma.shopping_mall_categoriesFindManyArgs,
              },
            } satisfies Prisma.shopping_mall_productsFindManyArgs,
            productVariant: {
              select: {
                id: true,
                sku_code: true,
                option_summary: true,
                price: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
            optionValues: {
              select: {
                id: true,
                option_name: true,
                option_value: true,
                display_order: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
              orderBy: [{ display_order: "asc" }, { id: "asc" }],
            } satisfies Prisma.shopping_mall_product_purchase_snapshot_option_valuesFindManyArgs,
          },
        } satisfies Prisma.shopping_mall_product_purchase_snapshotsFindManyArgs,
        sellerProfilePurchaseSnapshot: {
          select: {
            id: true,
            shop_name: true,
            logo_uri: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.shopping_mall_seller_profile_purchase_snapshotsFindManyArgs,
        cancellationRequest: {
          select: {
            id: true,
            status: true,
            reason: true,
            reviewed_by_type: true,
            reviewed_at: true,
            decision_note: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            customer: {
              select: {
                id: true,
                email: true,
                banned_at: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            } satisfies Prisma.shopping_mall_customersFindManyArgs,
          },
        } satisfies Prisma.shopping_mall_cancellation_requestsFindManyArgs,
        refundRequest: {
          select: {
            id: true,
            reason: true,
            status: true,
            reviewer_role: true,
            review_note: true,
            reviewed_at: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            customer: {
              select: {
                id: true,
                email: true,
                banned_at: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            } satisfies Prisma.shopping_mall_customersFindManyArgs,
          },
        } satisfies Prisma.shopping_mall_refund_requestsFindManyArgs,
        reviews: {
          select: {
            id: true,
            rating: true,
            content: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            customer: {
              select: {
                id: true,
                email: true,
                banned_at: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            } satisfies Prisma.shopping_mall_customersFindManyArgs,
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                base_price: true,
                status: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                seller: {
                  select: {
                    id: true,
                    email: true,
                    approval_status: true,
                    rejection_reason: true,
                    suspended: true,
                    banned: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                } satisfies Prisma.shopping_mall_sellersFindManyArgs,
                category: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                    parent: {
                      select: {
                        id: true,
                        name: true,
                        description: true,
                        created_at: true,
                        updated_at: true,
                        deleted_at: true,
                      },
                    } satisfies Prisma.shopping_mall_categoriesFindManyArgs,
                  },
                } satisfies Prisma.shopping_mall_categoriesFindManyArgs,
              },
            } satisfies Prisma.shopping_mall_productsFindManyArgs,
          },
          orderBy: [{ created_at: "asc" }, { id: "asc" }],
        } satisfies Prisma.shopping_mall_reviewsFindManyArgs,
      },
    },
  );
  if (order.addressSnapshot === null) {
    throw new HttpException("Order address snapshot not found", 404);
  }
  if (item.productPurchaseSnapshot === null) {
    throw new HttpException("Product purchase snapshot not found", 404);
  }
  if (item.sellerProfilePurchaseSnapshot === null) {
    throw new HttpException("Seller profile purchase snapshot not found", 404);
  }
  const orderAddressSnapshot = order.addressSnapshot;
  const productPurchaseSnapshotSource = item.productPurchaseSnapshot;
  const sellerProfilePurchaseSnapshotSource =
    item.sellerProfilePurchaseSnapshot;
  const buildCustomerSummary = (input: {
    id: string;
    email: string;
    banned_at: Date | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
  }): IShoppingMallCustomer.ISummary => ({
    id: input.id,
    email: input.email,
    banned_at: input.banned_at ? toISOStringSafe(input.banned_at) : null,
    created_at: toISOStringSafe(input.created_at),
    updated_at: toISOStringSafe(input.updated_at),
    deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
  });
  const buildSellerSummary = (input: {
    id: string;
    email: string;
    approval_status: string;
    rejection_reason: string | null;
    suspended: boolean;
    banned: boolean;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
  }): IShoppingMallSeller.ISummary => ({
    id: input.id,
    email: input.email,
    approval_status: input.approval_status,
    rejection_reason: input.rejection_reason,
    suspended: input.suspended,
    banned: input.banned,
    created_at: toISOStringSafe(input.created_at),
    updated_at: toISOStringSafe(input.updated_at),
    deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
  });
  const buildOrderSummary = (input: {
    id: string;
    code: string;
    status: string;
    total_price: number;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
  }): IShoppingMallOrder.ISummary => ({
    id: input.id,
    code: input.code,
    status: input.status,
    total_price: input.total_price,
    created_at: toISOStringSafe(input.created_at),
    updated_at: toISOStringSafe(input.updated_at),
    deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
  });
  const buildPaymentAttemptSummary = (input: {
    id: string;
    status: string;
    amount: number;
    gateway_provider: string;
    gateway_reference: string;
    failure_reason: string | null;
    processed_at: Date | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
  }): IShoppingMallPaymentAttempt.ISummary => ({
    id: input.id,
    status: input.status,
    amount: input.amount,
    gateway_provider: input.gateway_provider,
    gateway_reference: input.gateway_reference,
    failure_reason: input.failure_reason,
    processed_at: input.processed_at
      ? toISOStringSafe(input.processed_at)
      : null,
    created_at: toISOStringSafe(input.created_at),
    updated_at: toISOStringSafe(input.updated_at),
    deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
  });
  const buildCategorySummary = (input: {
    id: string;
    name: string;
    description: string;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
    parent: {
      id: string;
      name: string;
      description: string;
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
    } | null;
  }): IShoppingMallCategory.ISummary => ({
    id: input.id,
    name: input.name,
    description: input.description,
    parent: input.parent
      ? {
          id: input.parent.id,
          name: input.parent.name,
          description: input.parent.description,
          parent: null,
          created_at: toISOStringSafe(input.parent.created_at),
          updated_at: toISOStringSafe(input.parent.updated_at),
          deleted_at: input.parent.deleted_at
            ? toISOStringSafe(input.parent.deleted_at)
            : null,
        }
      : null,
    created_at: toISOStringSafe(input.created_at),
    updated_at: toISOStringSafe(input.updated_at),
    deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
  });
  const buildProductSummary = (input: {
    id: string;
    name: string;
    description: string;
    base_price: number;
    status: string;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
    seller: {
      id: string;
      email: string;
      approval_status: string;
      rejection_reason: string | null;
      suspended: boolean;
      banned: boolean;
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
    };
    category: {
      id: string;
      name: string;
      description: string;
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
      parent: {
        id: string;
        name: string;
        description: string;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
      } | null;
    } | null;
  }): IShoppingMallProduct.ISummary => ({
    id: input.id,
    name: input.name,
    description: input.description,
    base_price: input.base_price,
    status: input.status,
    seller: buildSellerSummary(input.seller),
    category: input.category ? buildCategorySummary(input.category) : null,
    created_at: toISOStringSafe(input.created_at),
    updated_at: toISOStringSafe(input.updated_at),
    deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
  });
  const buildProductVariantSummary = (input: {
    id: string;
    sku_code: string;
    option_summary: string;
    price: number | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
  }): IShoppingMallProductVariant.ISummary => ({
    id: input.id,
    sku_code: input.sku_code,
    option_summary: input.option_summary,
    price: input.price,
    created_at: toISOStringSafe(input.created_at),
    updated_at: toISOStringSafe(input.updated_at),
    deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
  });
  const buildShipmentSummary = (input: {
    id: string;
    shipped_at: Date;
    delivered_at: Date | null;
    auto_deliver_at: Date;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
    order: {
      id: string;
      code: string;
      status: string;
      total_price: number;
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
    };
    seller: {
      id: string;
      email: string;
      approval_status: string;
      rejection_reason: string | null;
      suspended: boolean;
      banned: boolean;
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
    };
  }): IShoppingMallShipment.ISummary => ({
    id: input.id,
    order: buildOrderSummary(input.order),
    seller: buildSellerSummary(input.seller),
    shipped_at: toISOStringSafe(input.shipped_at),
    delivered_at: input.delivered_at
      ? toISOStringSafe(input.delivered_at)
      : null,
    auto_deliver_at: toISOStringSafe(input.auto_deliver_at),
    created_at: toISOStringSafe(input.created_at),
    updated_at: toISOStringSafe(input.updated_at),
    deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
  });
  const buildOrderItemSummary = (): IShoppingMallOrderItem.ISummary => ({
    id: item.id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    status: item.status,
    delivered_at: item.delivered_at ? toISOStringSafe(item.delivered_at) : null,
    seller: buildSellerSummary(item.seller),
    productVariant: buildProductVariantSummary(item.productVariant),
    shipment: item.shipment ? buildShipmentSummary(item.shipment) : null,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
  });
  const orderSummary = buildOrderSummary(item.order);
  const orderItemSummary = buildOrderItemSummary();
  const shipmentDetail = item.shipment
    ? {
        id: item.shipment.id,
        order: orderSummary,
        seller: buildSellerSummary(item.shipment.seller),
        shipped_at: toISOStringSafe(item.shipment.shipped_at),
        delivered_at: item.shipment.delivered_at
          ? toISOStringSafe(item.shipment.delivered_at)
          : null,
        auto_deliver_at: toISOStringSafe(item.shipment.auto_deliver_at),
        trackingInfo: item.shipment.trackingInfo
          ? {
              id: item.shipment.trackingInfo.id,
              shipment: buildShipmentSummary(item.shipment),
              carrier_name: item.shipment.trackingInfo.carrier_name,
              tracking_number: item.shipment.trackingInfo.tracking_number,
              tracking_url: item.shipment.trackingInfo.tracking_url,
              created_at: toISOStringSafe(
                item.shipment.trackingInfo.created_at,
              ),
              updated_at: toISOStringSafe(
                item.shipment.trackingInfo.updated_at,
              ),
              deleted_at: item.shipment.trackingInfo.deleted_at
                ? toISOStringSafe(item.shipment.trackingInfo.deleted_at)
                : null,
            }
          : {
              id: "00000000-0000-0000-0000-000000000000",
              shipment: buildShipmentSummary(item.shipment),
              carrier_name: "",
              tracking_number: "",
              tracking_url: null,
              created_at: toISOStringSafe(item.shipment.created_at),
              updated_at: toISOStringSafe(item.shipment.updated_at),
              deleted_at: null,
            },
        orderItems: [
          {
            id: item.id,
            order: {
              id: order.id,
              code: order.code,
              status: order.status,
              total_price: order.total_price,
              customer: buildCustomerSummary(order.customer),
              paymentAttempt: order.paymentAttempt
                ? buildPaymentAttemptSummary(order.paymentAttempt)
                : null,
              addressSnapshot: {
                id: orderAddressSnapshot.id,
                order: orderSummary,
                recipient_name: orderAddressSnapshot.recipient_name,
                phone_number: orderAddressSnapshot.phone_number,
                street_address: orderAddressSnapshot.street_address,
                city: orderAddressSnapshot.city,
                state_province: orderAddressSnapshot.state_province,
                postal_code: orderAddressSnapshot.postal_code,
                country: orderAddressSnapshot.country,
                created_at: toISOStringSafe(orderAddressSnapshot.created_at),
                updated_at: toISOStringSafe(orderAddressSnapshot.updated_at),
                deleted_at: orderAddressSnapshot.deleted_at
                  ? toISOStringSafe(orderAddressSnapshot.deleted_at)
                  : null,
              },
              items: [],
              shipments: [],
              created_at: toISOStringSafe(order.created_at),
              updated_at: toISOStringSafe(order.updated_at),
              deleted_at: order.deleted_at
                ? toISOStringSafe(order.deleted_at)
                : null,
            },
            seller: buildSellerSummary(item.seller),
            productVariant: {
              id: item.productVariant.id,
              product: buildProductSummary(item.productVariant.product),
              sku_code: item.productVariant.sku_code,
              option_summary: item.productVariant.option_summary,
              price: item.productVariant.price,
              created_at: toISOStringSafe(item.productVariant.created_at),
              updated_at: toISOStringSafe(item.productVariant.updated_at),
              deleted_at: item.productVariant.deleted_at
                ? toISOStringSafe(item.productVariant.deleted_at)
                : null,
            },
            shipment: null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            status: item.status,
            delivered_at: item.delivered_at
              ? toISOStringSafe(item.delivered_at)
              : null,
            created_at: toISOStringSafe(item.created_at),
            updated_at: toISOStringSafe(item.updated_at),
            deleted_at: item.deleted_at
              ? toISOStringSafe(item.deleted_at)
              : null,
            productPurchaseSnapshot: {
              id: productPurchaseSnapshotSource.id,
              product_name: productPurchaseSnapshotSource.product_name,
              product_description:
                productPurchaseSnapshotSource.product_description,
              sku_code: productPurchaseSnapshotSource.sku_code,
              unit_price: productPurchaseSnapshotSource.unit_price,
              orderItem: orderItemSummary,
              product: productPurchaseSnapshotSource.product
                ? buildProductSummary(productPurchaseSnapshotSource.product)
                : null,
              productVariant: productPurchaseSnapshotSource.productVariant
                ? buildProductVariantSummary(
                    productPurchaseSnapshotSource.productVariant,
                  )
                : null,
              optionValues: [],
              created_at: toISOStringSafe(
                productPurchaseSnapshotSource.created_at,
              ),
              updated_at: toISOStringSafe(
                productPurchaseSnapshotSource.updated_at,
              ),
              deleted_at: productPurchaseSnapshotSource.deleted_at
                ? toISOStringSafe(productPurchaseSnapshotSource.deleted_at)
                : null,
            },
            sellerProfilePurchaseSnapshot: {
              id: sellerProfilePurchaseSnapshotSource.id,
              shop_name: sellerProfilePurchaseSnapshotSource.shop_name,
              logo_uri: sellerProfilePurchaseSnapshotSource.logo_uri,
              orderItem: orderItemSummary,
              created_at: toISOStringSafe(
                sellerProfilePurchaseSnapshotSource.created_at,
              ),
              updated_at: toISOStringSafe(
                sellerProfilePurchaseSnapshotSource.updated_at,
              ),
              deleted_at: sellerProfilePurchaseSnapshotSource.deleted_at
                ? toISOStringSafe(
                    sellerProfilePurchaseSnapshotSource.deleted_at,
                  )
                : null,
            },
            cancellationRequest: null,
            refundRequest: null,
            reviews: [],
          },
        ],
        created_at: toISOStringSafe(item.shipment.created_at),
        updated_at: toISOStringSafe(item.shipment.updated_at),
        deleted_at: item.shipment.deleted_at
          ? toISOStringSafe(item.shipment.deleted_at)
          : null,
      }
    : null;
  const snapshotBase = {
    id: productPurchaseSnapshotSource.id,
    product_name: productPurchaseSnapshotSource.product_name,
    product_description: productPurchaseSnapshotSource.product_description,
    sku_code: productPurchaseSnapshotSource.sku_code,
    unit_price: productPurchaseSnapshotSource.unit_price,
    orderItem: orderItemSummary,
    product: productPurchaseSnapshotSource.product
      ? buildProductSummary(productPurchaseSnapshotSource.product)
      : null,
    productVariant: productPurchaseSnapshotSource.productVariant
      ? buildProductVariantSummary(productPurchaseSnapshotSource.productVariant)
      : null,
    optionValues: [] as IShoppingMallProductPurchaseSnapshotOptionValue[],
    created_at: toISOStringSafe(productPurchaseSnapshotSource.created_at),
    updated_at: toISOStringSafe(productPurchaseSnapshotSource.updated_at),
    deleted_at: productPurchaseSnapshotSource.deleted_at
      ? toISOStringSafe(productPurchaseSnapshotSource.deleted_at)
      : null,
  } satisfies IShoppingMallProductPurchaseSnapshot;
  const productPurchaseSnapshot = {
    ...snapshotBase,
    optionValues: productPurchaseSnapshotSource.optionValues.map(
      (optionValue) => ({
        id: optionValue.id,
        productPurchaseSnapshot: snapshotBase,
        option_name: optionValue.option_name,
        option_value: optionValue.option_value,
        display_order: optionValue.display_order,
        created_at: toISOStringSafe(optionValue.created_at),
        updated_at: toISOStringSafe(optionValue.updated_at),
        deleted_at: optionValue.deleted_at
          ? toISOStringSafe(optionValue.deleted_at)
          : null,
      }),
    ),
  } satisfies IShoppingMallProductPurchaseSnapshot;
  const sellerProfilePurchaseSnapshot = {
    id: sellerProfilePurchaseSnapshotSource.id,
    shop_name: sellerProfilePurchaseSnapshotSource.shop_name,
    logo_uri: sellerProfilePurchaseSnapshotSource.logo_uri,
    orderItem: orderItemSummary,
    created_at: toISOStringSafe(sellerProfilePurchaseSnapshotSource.created_at),
    updated_at: toISOStringSafe(sellerProfilePurchaseSnapshotSource.updated_at),
    deleted_at: sellerProfilePurchaseSnapshotSource.deleted_at
      ? toISOStringSafe(sellerProfilePurchaseSnapshotSource.deleted_at)
      : null,
  } satisfies IShoppingMallSellerProfilePurchaseSnapshot;
  const cancellationRequest = item.cancellationRequest
    ? {
        id: item.cancellationRequest.id,
        orderItem: {
          id: item.id,
          order: {
            id: order.id,
            code: order.code,
            status: order.status,
            total_price: order.total_price,
            customer: buildCustomerSummary(order.customer),
            paymentAttempt: order.paymentAttempt
              ? buildPaymentAttemptSummary(order.paymentAttempt)
              : null,
            addressSnapshot: {
              id: orderAddressSnapshot.id,
              order: orderSummary,
              recipient_name: orderAddressSnapshot.recipient_name,
              phone_number: orderAddressSnapshot.phone_number,
              street_address: orderAddressSnapshot.street_address,
              city: orderAddressSnapshot.city,
              state_province: orderAddressSnapshot.state_province,
              postal_code: orderAddressSnapshot.postal_code,
              country: orderAddressSnapshot.country,
              created_at: toISOStringSafe(orderAddressSnapshot.created_at),
              updated_at: toISOStringSafe(orderAddressSnapshot.updated_at),
              deleted_at: orderAddressSnapshot.deleted_at
                ? toISOStringSafe(orderAddressSnapshot.deleted_at)
                : null,
            },
            items: [],
            shipments: [],
            created_at: toISOStringSafe(order.created_at),
            updated_at: toISOStringSafe(order.updated_at),
            deleted_at: order.deleted_at
              ? toISOStringSafe(order.deleted_at)
              : null,
          },
          seller: buildSellerSummary(item.seller),
          productVariant: {
            id: item.productVariant.id,
            product: buildProductSummary(item.productVariant.product),
            sku_code: item.productVariant.sku_code,
            option_summary: item.productVariant.option_summary,
            price: item.productVariant.price,
            created_at: toISOStringSafe(item.productVariant.created_at),
            updated_at: toISOStringSafe(item.productVariant.updated_at),
            deleted_at: item.productVariant.deleted_at
              ? toISOStringSafe(item.productVariant.deleted_at)
              : null,
          },
          shipment: shipmentDetail,
          quantity: item.quantity,
          unit_price: item.unit_price,
          status: item.status,
          delivered_at: item.delivered_at
            ? toISOStringSafe(item.delivered_at)
            : null,
          created_at: toISOStringSafe(item.created_at),
          updated_at: toISOStringSafe(item.updated_at),
          deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
          productPurchaseSnapshot,
          sellerProfilePurchaseSnapshot,
          cancellationRequest: null,
          refundRequest: null,
          reviews: [],
        },
        customer: buildCustomerSummary(item.cancellationRequest.customer),
        status: item.cancellationRequest.status,
        reason: item.cancellationRequest.reason,
        reviewed_by_type: item.cancellationRequest.reviewed_by_type,
        reviewed_at: item.cancellationRequest.reviewed_at
          ? toISOStringSafe(item.cancellationRequest.reviewed_at)
          : null,
        decision_note: item.cancellationRequest.decision_note,
        created_at: toISOStringSafe(item.cancellationRequest.created_at),
        updated_at: toISOStringSafe(item.cancellationRequest.updated_at),
        deleted_at: item.cancellationRequest.deleted_at
          ? toISOStringSafe(item.cancellationRequest.deleted_at)
          : null,
      }
    : null;
  const refundRequest = item.refundRequest
    ? {
        id: item.refundRequest.id,
        orderItem: orderItemSummary,
        customer: buildCustomerSummary(item.refundRequest.customer),
        reason: item.refundRequest.reason,
        status: item.refundRequest.status,
        reviewer_role: item.refundRequest.reviewer_role,
        review_note: item.refundRequest.review_note,
        reviewed_at: item.refundRequest.reviewed_at
          ? toISOStringSafe(item.refundRequest.reviewed_at)
          : null,
        created_at: toISOStringSafe(item.refundRequest.created_at),
        updated_at: toISOStringSafe(item.refundRequest.updated_at),
        deleted_at: item.refundRequest.deleted_at
          ? toISOStringSafe(item.refundRequest.deleted_at)
          : null,
      }
    : null;
  const reviews = item.reviews.map((review) => ({
    id: review.id,
    customer: buildCustomerSummary(review.customer),
    product: buildProductSummary(review.product),
    order: orderSummary,
    orderItem: orderItemSummary,
    rating: review.rating,
    content: review.content,
    created_at: toISOStringSafe(review.created_at),
    updated_at: toISOStringSafe(review.updated_at),
    deleted_at: review.deleted_at ? toISOStringSafe(review.deleted_at) : null,
  })) satisfies IShoppingMallReview[];
  const detailedItem = {
    id: item.id,
    order: {
      id: order.id,
      code: order.code,
      status: order.status,
      total_price: order.total_price,
      customer: buildCustomerSummary(order.customer),
      paymentAttempt: order.paymentAttempt
        ? buildPaymentAttemptSummary(order.paymentAttempt)
        : null,
      addressSnapshot: {
        id: orderAddressSnapshot.id,
        order: orderSummary,
        recipient_name: orderAddressSnapshot.recipient_name,
        phone_number: orderAddressSnapshot.phone_number,
        street_address: orderAddressSnapshot.street_address,
        city: orderAddressSnapshot.city,
        state_province: orderAddressSnapshot.state_province,
        postal_code: orderAddressSnapshot.postal_code,
        country: orderAddressSnapshot.country,
        created_at: toISOStringSafe(orderAddressSnapshot.created_at),
        updated_at: toISOStringSafe(orderAddressSnapshot.updated_at),
        deleted_at: orderAddressSnapshot.deleted_at
          ? toISOStringSafe(orderAddressSnapshot.deleted_at)
          : null,
      },
      items: [],
      shipments: shipmentDetail ? [shipmentDetail] : [],
      created_at: toISOStringSafe(order.created_at),
      updated_at: toISOStringSafe(order.updated_at),
      deleted_at: order.deleted_at ? toISOStringSafe(order.deleted_at) : null,
    },
    seller: buildSellerSummary(item.seller),
    productVariant: {
      id: item.productVariant.id,
      product: buildProductSummary(item.productVariant.product),
      sku_code: item.productVariant.sku_code,
      option_summary: item.productVariant.option_summary,
      price: item.productVariant.price,
      created_at: toISOStringSafe(item.productVariant.created_at),
      updated_at: toISOStringSafe(item.productVariant.updated_at),
      deleted_at: item.productVariant.deleted_at
        ? toISOStringSafe(item.productVariant.deleted_at)
        : null,
    },
    shipment: shipmentDetail,
    quantity: item.quantity,
    unit_price: item.unit_price,
    status: item.status,
    delivered_at: item.delivered_at ? toISOStringSafe(item.delivered_at) : null,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
    deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    productPurchaseSnapshot,
    sellerProfilePurchaseSnapshot,
    cancellationRequest,
    refundRequest,
    reviews,
  } satisfies IShoppingMallOrderItem;
  return {
    ...detailedItem,
    order: {
      ...detailedItem.order,
      items: [detailedItem],
    },
  } satisfies IShoppingMallOrderItem;
}
