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
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";
import { EcommerceMallRefundRequestTransformer } from "./EcommerceMallRefundRequestTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallRefundRequestSnapshotTransformer {
  export type Payload =
    Prisma.ecommerce_mall_refund_request_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_reason: true,
        snapshot_status: true,
        seller_response: true,
        seller_response_reason: true,
        created_at: true,
        updated_at: true,
        refundRequest: EcommerceMallRefundRequestTransformer.select(),
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
        seller: EcommerceMallSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_refund_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallRefundRequestSnapshot> {
    return {
      id: input.id,
      ecommerce_mall_refund_request_id: input.refundRequest.id,
      customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      seller: await EcommerceMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
      refundRequest: await EcommerceMallRefundRequestTransformer.transform(
        input.refundRequest,
      ),
      snapshot_reason: input.snapshot_reason,
      snapshot_status: input.snapshot_status,
      seller_response: input.seller_response,
      seller_response_reason: input.seller_response_reason,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
}
