import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
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

export async function getEcommerceMallSellerCancellationRequestsRequestIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  requestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCancellationRequestSnapshot> {
  // Fetch the snapshot with cancellation request context for authorization
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_cancellation_request_snapshots.findUniqueOrThrow(
      {
        where: {
          id: props.snapshotId,
          ecommerce_mall_cancellation_request_id: props.requestId,
        },
        select: {
          id: true,
          reason: true,
          status: true,
          created_at: true,
          cancellationRequest: {
            select: {
              id: true,
              ecommerce_mall_seller_id: true,
              reason: true,
              status: true,
              created_at: true,
              customer: {
                select: {
                  id: true,
                  email: true,
                  created_at: true,
                  display_name: true,
                  status: true,
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
                      logo_uri: true,
                      created_at: true,
                      updated_at: true,
                      deleted_at: true,
                    },
                  },
                },
              },
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
                      status: true,
                      total_amount: true,
                      created_at: true,
                      customer: {
                        select: {
                          id: true,
                          email: true,
                          created_at: true,
                          display_name: true,
                          status: true,
                        },
                      },
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
                              logo_uri: true,
                              created_at: true,
                              updated_at: true,
                              deleted_at: true,
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
            },
          },
        },
      },
    );
  // Verify seller owns the cancellation request
  if (
    snapshot.cancellationRequest.ecommerce_mall_seller_id !== props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform to response DTO
  return {
    id: snapshot.id as string & tags.Format<"uuid">,
    reason: snapshot.reason,
    status: snapshot.status as "approved" | "rejected",
    created_at: snapshot.created_at.toISOString() as string &
      tags.Format<"date-time">,
    cancellation_request: {
      id: snapshot.cancellationRequest.id as string & tags.Format<"uuid">,
      reason: snapshot.cancellationRequest.reason,
      status: snapshot.cancellationRequest.status,
      created_at:
        snapshot.cancellationRequest.created_at.toISOString() as string &
          tags.Format<"date-time">,
      customer: {
        id: snapshot.cancellationRequest.customer.id as string &
          tags.Format<"uuid">,
        email: snapshot.cancellationRequest.customer.email as string &
          tags.Format<"email">,
        created_at:
          snapshot.cancellationRequest.customer.created_at.toISOString() as string &
            tags.Format<"date-time">,
        display_name: snapshot.cancellationRequest.customer.display_name,
        status: snapshot.cancellationRequest.customer.status as
          | "active"
          | "deleted",
      },
      seller: {
        id: snapshot.cancellationRequest.seller.id as string &
          tags.Format<"uuid">,
        email: snapshot.cancellationRequest.seller.email as string &
          tags.Format<"email">,
        approval_status: snapshot.cancellationRequest.seller.approval_status,
        created_at:
          snapshot.cancellationRequest.seller.created_at.toISOString() as string &
            tags.Format<"date-time">,
        profile: {
          id: snapshot.cancellationRequest.seller.profile.id as string &
            tags.Format<"uuid">,
          name: snapshot.cancellationRequest.seller.profile.name,
          description: snapshot.cancellationRequest.seller.profile.description,
          logo_uri: snapshot.cancellationRequest.seller.profile.logo_uri,
          seller: {
            id: snapshot.cancellationRequest.seller.id as string &
              tags.Format<"uuid">,
            email: snapshot.cancellationRequest.seller.email as string &
              tags.Format<"email">,
            approval_status:
              snapshot.cancellationRequest.seller.approval_status,
            created_at:
              snapshot.cancellationRequest.seller.created_at.toISOString() as string &
                tags.Format<"date-time">,
          },
          created_at:
            snapshot.cancellationRequest.seller.profile.created_at.toISOString() as string &
              tags.Format<"date-time">,
          updated_at:
            snapshot.cancellationRequest.seller.profile.updated_at.toISOString() as string &
              tags.Format<"date-time">,
          deleted_at:
            (snapshot.cancellationRequest.seller.profile.deleted_at?.toISOString() as
              | (string & tags.Format<"date-time">)
              | null) ?? null,
        },
      },
      orderItem: {
        id: snapshot.cancellationRequest.orderItem.id as string &
          tags.Format<"uuid">,
        quantity: snapshot.cancellationRequest.orderItem.quantity as number &
          tags.Type<"int32">,
        unit_price: snapshot.cancellationRequest.orderItem.unit_price,
        status: snapshot.cancellationRequest.orderItem.status,
        created_at:
          snapshot.cancellationRequest.orderItem.created_at.toISOString() as string &
            tags.Format<"date-time">,
        subtotal:
          snapshot.cancellationRequest.orderItem.quantity *
          snapshot.cancellationRequest.orderItem.unit_price,
        order: {
          id: snapshot.cancellationRequest.orderItem.order.id as string &
            tags.Format<"uuid">,
          order_number:
            snapshot.cancellationRequest.orderItem.order.order_number,
          status: snapshot.cancellationRequest.orderItem.order.status,
          total_amount:
            snapshot.cancellationRequest.orderItem.order.total_amount,
          created_at:
            snapshot.cancellationRequest.orderItem.order.created_at.toISOString() as string &
              tags.Format<"date-time">,
          customer: {
            id: snapshot.cancellationRequest.orderItem.order.customer
              .id as string & tags.Format<"uuid">,
            email: snapshot.cancellationRequest.orderItem.order.customer
              .email as string & tags.Format<"email">,
            created_at:
              snapshot.cancellationRequest.orderItem.order.customer.created_at.toISOString() as string &
                tags.Format<"date-time">,
            display_name:
              snapshot.cancellationRequest.orderItem.order.customer
                .display_name,
            status: snapshot.cancellationRequest.orderItem.order.customer
              .status as "active" | "deleted",
          },
        },
        productSnapshot: {
          id: snapshot.cancellationRequest.orderItem.productSnapshot
            .id as string & tags.Format<"uuid">,
          name: snapshot.cancellationRequest.orderItem.productSnapshot.name,
          description:
            snapshot.cancellationRequest.orderItem.productSnapshot.description,
          base_price:
            snapshot.cancellationRequest.orderItem.productSnapshot.base_price,
          category_name:
            snapshot.cancellationRequest.orderItem.productSnapshot
              .category_name,
          created_at:
            snapshot.cancellationRequest.orderItem.productSnapshot.created_at.toISOString() as string &
              tags.Format<"date-time">,
          seller: {
            id: snapshot.cancellationRequest.orderItem.productSnapshot.seller
              .id as string & tags.Format<"uuid">,
            email: snapshot.cancellationRequest.orderItem.productSnapshot.seller
              .email as string & tags.Format<"email">,
            approval_status:
              snapshot.cancellationRequest.orderItem.productSnapshot.seller
                .approval_status,
            created_at:
              snapshot.cancellationRequest.orderItem.productSnapshot.seller.created_at.toISOString() as string &
                tags.Format<"date-time">,
            profile: {
              id: snapshot.cancellationRequest.orderItem.productSnapshot.seller
                .profile.id as string & tags.Format<"uuid">,
              name: snapshot.cancellationRequest.orderItem.productSnapshot
                .seller.profile.name,
              description:
                snapshot.cancellationRequest.orderItem.productSnapshot.seller
                  .profile.description,
              logo_uri:
                snapshot.cancellationRequest.orderItem.productSnapshot.seller
                  .profile.logo_uri,
              seller: {
                id: snapshot.cancellationRequest.orderItem.productSnapshot
                  .seller.id as string & tags.Format<"uuid">,
                email: snapshot.cancellationRequest.orderItem.productSnapshot
                  .seller.email as string & tags.Format<"email">,
                approval_status:
                  snapshot.cancellationRequest.orderItem.productSnapshot.seller
                    .approval_status,
                created_at:
                  snapshot.cancellationRequest.orderItem.productSnapshot.seller.created_at.toISOString() as string &
                    tags.Format<"date-time">,
              },
              created_at:
                snapshot.cancellationRequest.orderItem.productSnapshot.seller.profile.created_at.toISOString() as string &
                  tags.Format<"date-time">,
              updated_at:
                snapshot.cancellationRequest.orderItem.productSnapshot.seller.profile.updated_at.toISOString() as string &
                  tags.Format<"date-time">,
              deleted_at:
                (snapshot.cancellationRequest.orderItem.productSnapshot.seller.profile.deleted_at?.toISOString() as
                  | (string & tags.Format<"date-time">)
                  | null) ?? null,
            },
          },
        },
        sellerProfileSnapshot: {
          id: snapshot.cancellationRequest.orderItem.sellerProfileSnapshot
            .id as string & tags.Format<"uuid">,
          shop_name:
            snapshot.cancellationRequest.orderItem.sellerProfileSnapshot
              .shop_name,
          shop_description:
            snapshot.cancellationRequest.orderItem.sellerProfileSnapshot
              .shop_description,
          logo_url:
            snapshot.cancellationRequest.orderItem.sellerProfileSnapshot
              .logo_url,
          created_at:
            snapshot.cancellationRequest.orderItem.sellerProfileSnapshot.created_at.toISOString() as string &
              tags.Format<"date-time">,
        },
      },
    },
  };
}
