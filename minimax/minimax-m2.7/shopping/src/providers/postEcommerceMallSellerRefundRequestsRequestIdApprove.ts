import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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

export async function postEcommerceMallSellerRefundRequestsRequestIdApprove(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallRefundRequest> {
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUnique({
      where: { id: props.requestId },
      select: {
        id: true,
        ecommerce_mall_customer_id: true,
        ecommerce_mall_seller_id: true,
        ecommerce_mall_order_item_id: true,
        reason: true,
        status: true,
        seller_response_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (refundRequest === null) {
    throw new HttpException("Refund request not found", 404);
  }
  if (refundRequest.deleted_at !== null) {
    throw new HttpException("Refund request has been deleted", 400);
  }
  if (refundRequest.status !== "pending") {
    throw new HttpException("The request has already been processed", 400);
  }
  if (refundRequest.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    const now = new Date();
    await tx.ecommerce_mall_refund_requests.update({
      where: { id: props.requestId },
      data: {
        status: "approved",
        seller_response_at: now,
        updated_at: now,
      },
    });
    await tx.ecommerce_mall_refund_request_snapshots.create({
      data: {
        id: v4(),
        ecommerce_mall_refund_request_id: props.requestId,
        ecommerce_mall_customer_id: refundRequest.ecommerce_mall_customer_id,
        ecommerce_mall_seller_id: refundRequest.ecommerce_mall_seller_id,
        snapshot_reason: refundRequest.reason,
        snapshot_status: "approved",
        seller_response: "approved",
        seller_response_reason: null,
        created_at: now,
        updated_at: now,
      },
    });
    const orderItem = await tx.ecommerce_mall_order_items.findUnique({
      where: { id: refundRequest.ecommerce_mall_order_item_id },
      select: {
        id: true,
        ecommerce_mall_product_variant_id: true,
        quantity: true,
      },
    });
    if (orderItem === null) {
      throw new Error("Order item not found");
    }
    await tx.ecommerce_mall_inventory_records.create({
      data: {
        id: v4(),
        ecommerce_mall_product_variant_id:
          orderItem.ecommerce_mall_product_variant_id,
        quantity_change: orderItem.quantity,
        reason: "refund",
        created_at: now,
      },
    });
  });
  const fullRefundRequest =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      select: {
        id: true,
        reason: true,
        status: true,
        seller_response_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        orderItem: {
          select: {
            id: true,
            quantity: true,
            unit_price: true,
            status: true,
            created_at: true,
            order: {
              select: {
                id: true,
                order_number: true,
              },
            },
            productSnapshot: {
              select: {
                id: true,
                name: true,
                description: true,
                base_price: true,
                category_name: true,
                created_at: true,
                seller: {
                  select: {
                    id: true,
                    email: true,
                    approval_status: true,
                    created_at: true,
                    profile: {
                      select: {
                        id: true,
                        name: true,
                        description: true,
                      },
                    },
                  },
                },
              },
            },
            sellerProfileSnapshot: {
              select: {
                id: true,
                shop_name: true,
                shop_description: true,
                logo_url: true,
                created_at: true,
              },
            },
          },
        },
        seller: {
          select: {
            id: true,
            email: true,
            approval_status: true,
            created_at: true,
            profile: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
        refundRequestSnapshots: {
          select: {
            id: true,
            snapshot_reason: true,
            snapshot_status: true,
            seller_response: true,
            seller_response_reason: true,
            created_at: true,
            updated_at: true,
            customer: {
              select: {
                id: true,
                email: true,
                created_at: true,
                profile: {
                  select: {
                    display_name: true,
                  },
                },
              },
            },
            seller: {
              select: {
                id: true,
                email: true,
                approval_status: true,
                created_at: true,
                profile: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  const buildSellerSummary = (
    sellerId: string,
    email: string,
    approval_status: string,
    created_at: Date,
    profileId: string | null | undefined,
    profileName: string | null | undefined,
    profileDescription: string | null | undefined,
  ): IEcommerceMallSeller.ISummary => ({
    id: sellerId,
    email: email as string & tags.Format<"email">,
    approval_status: approval_status,
    created_at: created_at.toISOString(),
    profile: {
      id: profileId ?? "",
      name: profileName ?? "",
      description: profileDescription ?? "",
      logo_uri: null,
      seller: {} as IEcommerceMallSeller.ISummary,
      created_at: "",
      updated_at: "",
      deleted_at: null,
    },
  });
  const productSnapshotSeller = buildSellerSummary(
    fullRefundRequest.orderItem.productSnapshot.seller.id,
    fullRefundRequest.orderItem.productSnapshot.seller.email,
    fullRefundRequest.orderItem.productSnapshot.seller.approval_status,
    fullRefundRequest.orderItem.productSnapshot.seller.created_at,
    fullRefundRequest.orderItem.productSnapshot.seller.profile?.id,
    fullRefundRequest.orderItem.productSnapshot.seller.profile?.name,
    fullRefundRequest.orderItem.productSnapshot.seller.profile?.description,
  );
  const mainSeller = buildSellerSummary(
    fullRefundRequest.seller.id,
    fullRefundRequest.seller.email,
    fullRefundRequest.seller.approval_status,
    fullRefundRequest.seller.created_at,
    fullRefundRequest.seller.profile?.id,
    fullRefundRequest.seller.profile?.name,
    fullRefundRequest.seller.profile?.description,
  );
  const orderItemSummary: IEcommerceMallOrderItem.ISummary = {
    id: fullRefundRequest.orderItem.id,
    quantity: fullRefundRequest.orderItem.quantity as number &
      tags.Type<"int32">,
    unit_price: fullRefundRequest.orderItem.unit_price,
    status: fullRefundRequest.orderItem.status,
    created_at: fullRefundRequest.orderItem.created_at.toISOString(),
    subtotal:
      fullRefundRequest.orderItem.quantity *
      fullRefundRequest.orderItem.unit_price,
    order: {
      id: fullRefundRequest.orderItem.order.id,
      order_number: fullRefundRequest.orderItem.order.order_number,
      status: "",
      total_amount: 0,
      created_at: "",
      customer: {
        id: "",
        email: "" as string & tags.Format<"email">,
        created_at: "",
        display_name: null,
        status: "active" as const,
      },
    },
    productSnapshot: {
      id: fullRefundRequest.orderItem.productSnapshot.id,
      name: fullRefundRequest.orderItem.productSnapshot.name,
      description: fullRefundRequest.orderItem.productSnapshot.description,
      base_price: Number(
        fullRefundRequest.orderItem.productSnapshot.base_price,
      ),
      category_name: fullRefundRequest.orderItem.productSnapshot.category_name,
      created_at:
        fullRefundRequest.orderItem.productSnapshot.created_at.toISOString(),
      seller: productSnapshotSeller,
    },
    sellerProfileSnapshot: {
      id: fullRefundRequest.orderItem.sellerProfileSnapshot.id,
      shop_name: fullRefundRequest.orderItem.sellerProfileSnapshot.shop_name,
      shop_description:
        fullRefundRequest.orderItem.sellerProfileSnapshot.shop_description ??
        null,
      logo_url:
        fullRefundRequest.orderItem.sellerProfileSnapshot.logo_url ?? null,
      created_at:
        fullRefundRequest.orderItem.sellerProfileSnapshot.created_at.toISOString(),
    },
  };
  const result: IEcommerceMallRefundRequest = {
    id: fullRefundRequest.id,
    reason: fullRefundRequest.reason,
    status: fullRefundRequest.status,
    seller_response_at:
      fullRefundRequest.seller_response_at?.toISOString() ?? null,
    created_at: fullRefundRequest.created_at.toISOString(),
    updated_at: fullRefundRequest.updated_at.toISOString(),
    deleted_at: fullRefundRequest.deleted_at?.toISOString() ?? undefined,
    orderItem: orderItemSummary,
    seller: mainSeller,
    refundRequestSnapshots: [],
  };
  result.refundRequestSnapshots = fullRefundRequest.refundRequestSnapshots.map(
    (snapshot) => {
      const snapshotCustomer: IEcommerceMallCustomer.ISummary = {
        id: snapshot.customer.id,
        email: snapshot.customer.email as string & tags.Format<"email">,
        created_at: snapshot.customer.created_at.toISOString(),
        display_name: snapshot.customer.profile?.display_name ?? null,
        status: "active" as const,
      };
      const snapshotSeller = buildSellerSummary(
        snapshot.seller.id,
        snapshot.seller.email,
        snapshot.seller.approval_status,
        snapshot.seller.created_at,
        snapshot.seller.profile?.id,
        snapshot.seller.profile?.name,
        snapshot.seller.profile?.description,
      );
      return {
        id: snapshot.id,
        ecommerce_mall_refund_request_id: fullRefundRequest.id,
        customer: snapshotCustomer,
        seller: snapshotSeller,
        refundRequest: result,
        snapshot_reason: snapshot.snapshot_reason,
        snapshot_status: snapshot.snapshot_status,
        seller_response: snapshot.seller_response,
        seller_response_reason: snapshot.seller_response_reason,
        created_at: snapshot.created_at.toISOString(),
        updated_at: snapshot.updated_at.toISOString(),
      } satisfies IEcommerceMallRefundRequestSnapshot;
    },
  );
  return result;
}
