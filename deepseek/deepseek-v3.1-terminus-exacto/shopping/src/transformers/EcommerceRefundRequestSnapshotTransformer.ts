import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEcommerceRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequestSnapshot";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceAdministratorAtSummaryTransformer } from "./EcommerceAdministratorAtSummaryTransformer";
import { EcommerceCustomerAtSummaryTransformer } from "./EcommerceCustomerAtSummaryTransformer";
import { EcommerceRefundRequestAtSummaryTransformer } from "./EcommerceRefundRequestAtSummaryTransformer";
import { EcommerceSellerAtSummaryTransformer } from "./EcommerceSellerAtSummaryTransformer";

export namespace EcommerceRefundRequestSnapshotTransformer {
  export type Payload = Prisma.ecommerce_refund_request_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        before_state: true,
        after_state: true,
        change_description: true,
        refundRequest: EcommerceRefundRequestAtSummaryTransformer.select(),
        modifyingCustomer: EcommerceCustomerAtSummaryTransformer.select(),
        modifyingSeller: EcommerceSellerAtSummaryTransformer.select(),
        modifyingAdministrator:
          EcommerceAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_refund_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceRefundRequestSnapshot> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      before_state: input.before_state,
      after_state: input.after_state,
      change_description: input.change_description,
      refundRequest: await EcommerceRefundRequestAtSummaryTransformer.transform(
        input.refundRequest,
      ),
      modifyingCustomer: input.modifyingCustomer
        ? await EcommerceCustomerAtSummaryTransformer.transform(
            input.modifyingCustomer,
          )
        : null,
      modifyingSeller: input.modifyingSeller
        ? await EcommerceSellerAtSummaryTransformer.transform(
            input.modifyingSeller,
          )
        : null,
      modifyingAdministrator: input.modifyingAdministrator
        ? await EcommerceAdministratorAtSummaryTransformer.transform(
            input.modifyingAdministrator,
          )
        : null,
    };
  }
}
