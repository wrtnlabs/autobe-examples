import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEcommerceRefundResponseRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundResponseRecord";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceRefundRequestAtSummaryTransformer } from "./EcommerceRefundRequestAtSummaryTransformer";
import { EcommerceSellerAtSummaryTransformer } from "./EcommerceSellerAtSummaryTransformer";

export namespace EcommerceRefundResponseRecordTransformer {
  export type Payload = Prisma.ecommerce_refund_response_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        decision: true,
        response_reason: true,
        responded_at: true,
        created_at: true,
        updated_at: true,
        seller: EcommerceSellerAtSummaryTransformer.select(),
        refundRequest: EcommerceRefundRequestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_refund_response_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceRefundResponseRecord> {
    return {
      id: input.id,
      decision: input.decision,
      response_reason: input.response_reason,
      responded_at: input.responded_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      seller: await EcommerceSellerAtSummaryTransformer.transform(input.seller),
      refundRequest: await EcommerceRefundRequestAtSummaryTransformer.transform(
        input.refundRequest,
      ),
    };
  }
}
