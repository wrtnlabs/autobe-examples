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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallRefundRequestTransformer } from "../transformers/EcommerceMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerRefundRequestsRequestId(props: {
  customer: CustomerPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallRefundRequest> {
  // Fetch refund request with all required relations
  const refundRequest =
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
  // Authorization check: customer can only view their own refund requests
  if (refundRequest.customer.id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform and return the refund request with full nested data
  return await EcommerceMallRefundRequestTransformer.transform(
    refundRequest as any,
    undefined,
  );
}
