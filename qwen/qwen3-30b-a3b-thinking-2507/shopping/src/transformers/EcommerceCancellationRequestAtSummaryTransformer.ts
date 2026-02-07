import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCustomerAtSummaryTransformer } from "./EcommerceCustomerAtSummaryTransformer";
import { EcommerceOrderAtSummaryTransformer } from "./EcommerceOrderAtSummaryTransformer";

export namespace EcommerceCancellationRequestAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_cancellation_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        created_at: true,
        customer: EcommerceCustomerAtSummaryTransformer.select(),
        order: EcommerceOrderAtSummaryTransformer.select(),
        deleted_at: true,
        reason: true,
        updated_at: true,
      },
    } satisfies Prisma.ecommerce_cancellation_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceCancellationRequest.ISummary> {
    return {
      id: input.id,
      status: typia.assert<"pending" | "approved" | "rejected" | "completed">(
        input.status,
      ),
      created_at: toISOStringSafe(input.created_at),
      customer: await EcommerceCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      order: await EcommerceOrderAtSummaryTransformer.transform(input.order),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
