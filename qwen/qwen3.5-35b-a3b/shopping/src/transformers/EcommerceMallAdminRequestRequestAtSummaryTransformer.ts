import { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallAdminRequestRequestAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_admin_request_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        request_status: true,
        created_at: true,
        updated_at: true,
        customerRequests: {
          select: {
            customer: {
              select: {
                id: true,
                email: true,
                is_banned: true,
                created_at: true,
              },
            },
          },
        },
        sellerRequests: {
          select: {
            seller: {
              select: {
                id: true,
                email: true,
                approval_status: true,
                rejection_reason: true,
                is_suspended: true,
                is_banned: true,
                created_at: true,
                updated_at: true,
              },
            },
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_admin_request_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdminRequestRequest.ISummary> {
    const customer = input.customerRequests
      ? {
          id: input.customerRequests.customer.id,
          email: input.customerRequests.customer.email,
          display_name: "",
          is_banned: input.customerRequests.customer.is_banned,
          created_at: input.customerRequests.customer.created_at.toISOString(),
        }
      : {
          id: "",
          email: "",
          display_name: "",
          is_banned: false,
          created_at: new Date().toISOString(),
        };
    const seller = input.sellerRequests
      ? {
          id: input.sellerRequests.seller.id,
          email: input.sellerRequests.seller.email,
          approvalStatus: typia.assert<"pending" | "approved" | "rejected">(
            input.sellerRequests.seller.approval_status,
          ),
          rejectionReason: input.sellerRequests.seller.rejection_reason ?? null,
          isSuspended: input.sellerRequests.seller.is_suspended,
          isBanned: input.sellerRequests.seller.is_banned,
          createdAt: input.sellerRequests.seller.created_at.toISOString(),
          updatedAt: input.sellerRequests.seller.updated_at.toISOString(),
        }
      : {
          id: "",
          email: "",
          approvalStatus: "pending",
          rejectionReason: null,
          isSuspended: false,
          isBanned: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
    return {
      id: input.id,
      reason: input.reason,
      request_status: typia.assert<"pending" | "approved" | "rejected">(
        input.request_status,
      ),
      customer,
      seller,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
