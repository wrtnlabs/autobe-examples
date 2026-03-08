import { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallAdminRequestRequestAtRejectionTransformer {
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
        admin: true,
        snapshots: true,
        customerRequests: true,
        sellerRequests: true,
      },
    } satisfies Prisma.ecommerce_mall_admin_request_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdminRequestRequest.IRejection> {
    const requesterType = input.customerRequests
      ? ("customer" as const)
      : ("seller" as const);
    const requesterId = input.customerRequests?.id ?? input.sellerRequests!.id;
    return {
      id: input.id,
      reason: input.reason,
      request_status: "rejected",
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      requester_info: {
        id: requesterId,
        type: requesterType,
      },
    } satisfies IEcommerceMallAdminRequestRequest.IRejection;
  }
}
