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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerCancellationRequestsRequestIdSnapshotsSnapshotId(props: {
  customer: CustomerPayload;
  requestId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCancellationRequestSnapshot> {
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
              reason: true,
              status: true,
              created_at: true,
              ecommerce_mall_customer_id: true,
              ecommerce_mall_seller_id: true,
              ecommerce_mall_order_item_id: true,
              customer: {
                select: {
                  id: true,
                  email: true,
                  created_at: true,
                  deleted_at: true,
                  profile: {
                    select: {
                      id: true,
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
                  deleted_at: true,
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
                  ecommerce_mall_order_id: true,
                  ecommerce_mall_product_snapshot_id: true,
                  ecommerce_mall_seller_profile_snapshot_id: true,
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
                          deleted_at: true,
                          profile: {
                            select: {
                              id: true,
                              display_name: true,
                            },
                          },
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
                          deleted_at: true,
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
  if (
    snapshot.cancellationRequest.ecommerce_mall_customer_id !==
    props.customer.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const cr = snapshot.cancellationRequest;
  const customerStatus: "active" | "deleted" =
    cr.customer.deleted_at === null ? "active" : "deleted";
  const orderCustomerStatus: "active" | "deleted" =
    cr.orderItem.order.customer.deleted_at === null ? "active" : "deleted";
  return {
    id: snapshot.id,
    reason: snapshot.reason,
    status: snapshot.status as "approved" | "rejected",
    created_at: snapshot.created_at.toISOString(),
    cancellation_request: {
      id: cr.id,
      reason: cr.reason,
      status: cr.status,
      created_at: cr.created_at.toISOString(),
      customer: {
        id: cr.customer.id,
        email: cr.customer.email,
        created_at: cr.customer.created_at.toISOString(),
        display_name: cr.customer.profile?.display_name ?? null,
        status: customerStatus,
      },
      seller: {
        id: cr.seller.id,
        email: cr.seller.email,
        approval_status: cr.seller.approval_status,
        created_at: cr.seller.created_at.toISOString(),
        profile: {
          id: cr.seller.profile.id,
          name: cr.seller.profile.name,
          description: cr.seller.profile.description,
          logo_uri: cr.seller.profile.logo_uri,
          seller: {
            id: cr.seller.id,
            email: cr.seller.email,
            approval_status: cr.seller.approval_status,
            created_at: cr.seller.created_at.toISOString(),
            profile: {
              id: cr.seller.profile.id,
              name: cr.seller.profile.name,
              description: cr.seller.profile.description,
              logo_uri: cr.seller.profile.logo_uri,
              seller: {
                id: cr.seller.id,
                email: cr.seller.email,
                approval_status: cr.seller.approval_status,
                created_at: cr.seller.created_at.toISOString(),
                profile: {
                  id: cr.seller.profile.id,
                  name: cr.seller.profile.name,
                  description: cr.seller.profile.description,
                  logo_uri: cr.seller.profile.logo_uri,
                  created_at: cr.seller.profile.created_at.toISOString(),
                  updated_at: cr.seller.profile.updated_at.toISOString(),
                  deleted_at:
                    cr.seller.profile.deleted_at?.toISOString() ?? null,
                },
                created_at: cr.seller.created_at.toISOString(),
                updated_at: cr.seller.profile.updated_at.toISOString(),
                deleted_at: cr.seller.profile.deleted_at?.toISOString() ?? null,
              },
              created_at: cr.seller.profile.created_at.toISOString(),
              updated_at: cr.seller.profile.updated_at.toISOString(),
              deleted_at: cr.seller.profile.deleted_at?.toISOString() ?? null,
            },
            created_at: cr.seller.created_at.toISOString(),
            updated_at: cr.seller.profile.updated_at.toISOString(),
            deleted_at: cr.seller.profile.deleted_at?.toISOString() ?? null,
          },
          created_at: cr.seller.profile.created_at.toISOString(),
          updated_at: cr.seller.profile.updated_at.toISOString(),
          deleted_at: cr.seller.profile.deleted_at?.toISOString() ?? null,
        },
        created_at: cr.seller.created_at.toISOString(),
        updated_at: cr.seller.profile.updated_at.toISOString(),
        deleted_at: cr.seller.profile.deleted_at?.toISOString() ?? null,
      },
      orderItem: {
        id: cr.orderItem.id,
        quantity: cr.orderItem.quantity,
        unit_price: cr.orderItem.unit_price,
        status: cr.orderItem.status,
        created_at: cr.orderItem.created_at.toISOString(),
        subtotal: cr.orderItem.quantity * cr.orderItem.unit_price,
        order: {
          id: cr.orderItem.order.id,
          order_number: cr.orderItem.order.order_number,
          status: cr.orderItem.order.status,
          total_amount: cr.orderItem.order.total_amount,
          created_at: cr.orderItem.order.created_at.toISOString(),
          customer: {
            id: cr.orderItem.order.customer.id,
            email: cr.orderItem.order.customer.email,
            created_at: cr.orderItem.order.customer.created_at.toISOString(),
            display_name:
              cr.orderItem.order.customer.profile?.display_name ?? null,
            status: orderCustomerStatus,
          },
        },
        productSnapshot: {
          id: cr.orderItem.productSnapshot.id,
          name: cr.orderItem.productSnapshot.name,
          description: cr.orderItem.productSnapshot.description,
          base_price: cr.orderItem.productSnapshot.base_price,
          category_name: cr.orderItem.productSnapshot.category_name,
          created_at: cr.orderItem.productSnapshot.created_at.toISOString(),
          seller: {
            id: cr.orderItem.productSnapshot.seller.id,
            email: cr.orderItem.productSnapshot.seller.email,
            approval_status:
              cr.orderItem.productSnapshot.seller.approval_status,
            created_at:
              cr.orderItem.productSnapshot.seller.created_at.toISOString(),
            profile: {
              id: cr.orderItem.productSnapshot.seller.profile.id,
              name: cr.orderItem.productSnapshot.seller.profile.name,
              description:
                cr.orderItem.productSnapshot.seller.profile.description,
              logo_uri: cr.orderItem.productSnapshot.seller.profile.logo_uri,
              seller: {
                id: cr.orderItem.productSnapshot.seller.id,
                email: cr.orderItem.productSnapshot.seller.email,
                approval_status:
                  cr.orderItem.productSnapshot.seller.approval_status,
                created_at:
                  cr.orderItem.productSnapshot.seller.created_at.toISOString(),
                profile: {
                  id: cr.orderItem.productSnapshot.seller.profile.id,
                  name: cr.orderItem.productSnapshot.seller.profile.name,
                  description:
                    cr.orderItem.productSnapshot.seller.profile.description,
                  logo_uri:
                    cr.orderItem.productSnapshot.seller.profile.logo_uri,
                  created_at:
                    cr.orderItem.productSnapshot.seller.profile.created_at.toISOString(),
                  updated_at:
                    cr.orderItem.productSnapshot.seller.profile.updated_at.toISOString(),
                  deleted_at:
                    cr.orderItem.productSnapshot.seller.profile.deleted_at?.toISOString() ??
                    null,
                },
                created_at:
                  cr.orderItem.productSnapshot.seller.created_at.toISOString(),
                updated_at:
                  cr.orderItem.productSnapshot.seller.profile.updated_at.toISOString(),
                deleted_at:
                  cr.orderItem.productSnapshot.seller.profile.deleted_at?.toISOString() ??
                  null,
              },
              created_at:
                cr.orderItem.productSnapshot.seller.profile.created_at.toISOString(),
              updated_at:
                cr.orderItem.productSnapshot.seller.profile.updated_at.toISOString(),
              deleted_at:
                cr.orderItem.productSnapshot.seller.profile.deleted_at?.toISOString() ??
                null,
            },
            created_at:
              cr.orderItem.productSnapshot.seller.created_at.toISOString(),
            updated_at:
              cr.orderItem.productSnapshot.seller.profile.updated_at.toISOString(),
            deleted_at:
              cr.orderItem.productSnapshot.seller.profile.deleted_at?.toISOString() ??
              null,
          },
        },
        sellerProfileSnapshot: {
          id: cr.orderItem.sellerProfileSnapshot.id,
          shop_name: cr.orderItem.sellerProfileSnapshot.shop_name,
          shop_description:
            cr.orderItem.sellerProfileSnapshot.shop_description ?? null,
          logo_url: cr.orderItem.sellerProfileSnapshot.logo_url ?? null,
          created_at:
            cr.orderItem.sellerProfileSnapshot.created_at.toISOString(),
        },
      },
    },
  };
}
