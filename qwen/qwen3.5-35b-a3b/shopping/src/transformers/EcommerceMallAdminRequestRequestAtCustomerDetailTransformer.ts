import { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";

export namespace EcommerceMallAdminRequestRequestAtCustomerDetailTransformer {
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
        customerRequests: {
          select: {
            customer: EcommerceMallCustomerAtSummaryTransformer.select(),
          },
        } satisfies Prisma.ecommerce_mall_admin_request_request_of_customersFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_admin_request_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdminRequestRequest.ICustomerDetail> {
    return {
      id: input.id,
      reason: input.reason,
      requestStatus: typia.assert<"pending" | "approved" | "rejected">(
        input.request_status,
      ),
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.customerRequests!.customer,
      ),
    } satisfies IEcommerceMallAdminRequestRequest.ICustomerDetail;
  }
}
