import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequestSnapshot";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceAdministratorAtSummaryTransformer } from "./EcommerceAdministratorAtSummaryTransformer";
import { EcommerceCustomerAtSummaryTransformer } from "./EcommerceCustomerAtSummaryTransformer";
import { EcommerceSellerAtSummaryTransformer } from "./EcommerceSellerAtSummaryTransformer";

export namespace EcommerceRefundRequestSnapshotAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_refund_request_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        change_description: true,
        before_state: true,
        after_state: true,
        refundRequest: true,
        modifyingCustomer: EcommerceCustomerAtSummaryTransformer.select(),
        modifyingSeller: EcommerceSellerAtSummaryTransformer.select(),
        modifyingAdministrator:
          EcommerceAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_refund_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceRefundRequestSnapshot.ISummary> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      change_description: input.change_description,
      modifying_customer: input.modifyingCustomer
        ? await EcommerceCustomerAtSummaryTransformer.transform(
            input.modifyingCustomer,
          )
        : null,
      modifying_seller: input.modifyingSeller
        ? await EcommerceSellerAtSummaryTransformer.transform(
            input.modifyingSeller,
          )
        : null,
      modifying_administrator: input.modifyingAdministrator
        ? await EcommerceAdministratorAtSummaryTransformer.transform(
            input.modifyingAdministrator,
          )
        : null,
    };
  }
}
