import { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallAdminRequestRequestAtRejectRequestTransformer {
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
        deleted_at: true,
        admin: {
          select: {
            id: true,
            email: true,
          },
        } satisfies Prisma.ecommerce_mall_adminsFindManyArgs,
        snapshots: {
          select: {
            id: true,
            reason: true,
            created_at: true,
          },
        } satisfies Prisma.ecommerce_mall_admin_request_snapshotsFindManyArgs,
        customerRequests: {
          select: {
            id: true,
            customer_id: true,
            created_at: true,
          },
        } satisfies Prisma.ecommerce_mall_admin_request_request_of_customersFindManyArgs,
        sellerRequests: {
          select: {
            id: true,
            seller_id: true,
            created_at: true,
          },
        } satisfies Prisma.ecommerce_mall_admin_request_request_of_sellersFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_admin_request_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdminRequestRequest.IRejectRequest> {
    return {
      rejectionReason: input.reason,
    };
  }
}
