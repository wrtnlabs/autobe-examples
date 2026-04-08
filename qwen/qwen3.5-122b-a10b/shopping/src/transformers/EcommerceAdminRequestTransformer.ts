import { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { IEcommerceAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminRequest";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceAdminAtSummaryTransformer } from "./EcommerceAdminAtSummaryTransformer";
import { EcommerceCustomerAtSummaryTransformer } from "./EcommerceCustomerAtSummaryTransformer";
import { EcommerceSellerAtSummaryTransformer } from "./EcommerceSellerAtSummaryTransformer";

export namespace EcommerceAdminRequestTransformer {
  export type Payload = Prisma.ecommerce_admin_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        requester_type: true,
        reason: true,
        status: true,
        rejection_reason: true,
        reviewed_at: true,
        created_at: true,
        updated_at: true,
        requestingCustomer: EcommerceCustomerAtSummaryTransformer.select(),
        requestingSeller: EcommerceSellerAtSummaryTransformer.select(),
        reviewingAdmin: EcommerceAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_admin_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceAdminRequest> {
    return {
      id: input.id,
      requester_customer_id: input.requestingCustomer?.id ?? null,
      requester_seller_id: input.requestingSeller?.id ?? null,
      requester_type: input.requester_type,
      reason: input.reason,
      status: input.status,
      rejection_reason: input.rejection_reason,
      reviewed_by_id: input.reviewingAdmin?.id ?? null,
      reviewed_at: input.reviewed_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      requestingCustomer: input.requestingCustomer
        ? await EcommerceCustomerAtSummaryTransformer.transform(
            input.requestingCustomer,
          )
        : null,
      requestingSeller: input.requestingSeller
        ? await EcommerceSellerAtSummaryTransformer.transform(
            input.requestingSeller,
          )
        : null,
      reviewingAdmin: input.reviewingAdmin
        ? await EcommerceAdminAtSummaryTransformer.transform(
            input.reviewingAdmin,
          )
        : null,
    } satisfies IEcommerceAdminRequest;
  }
}
