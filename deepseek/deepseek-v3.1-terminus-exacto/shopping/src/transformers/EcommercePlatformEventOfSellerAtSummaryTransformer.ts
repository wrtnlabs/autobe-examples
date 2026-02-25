import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommercePlatformEventOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfSeller";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceAdministratorAtSummaryTransformer } from "./EcommerceAdministratorAtSummaryTransformer";
import { EcommerceSellerAtSummaryTransformer } from "./EcommerceSellerAtSummaryTransformer";

export namespace EcommercePlatformEventOfSellerAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_seller_approval_queuesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        submission_date: true,
        review_start_date: true,
        approval_date: true,
        rejection_date: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        seller: EcommerceSellerAtSummaryTransformer.select(),
        administrator: EcommerceAdministratorAtSummaryTransformer.select(),
        approvalResponses: true,
      },
    } satisfies Prisma.ecommerce_seller_approval_queuesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformEventOfSeller.ISummary> {
    return {
      id: input.id,
      status: input.status,
      submission_date: input.submission_date.toISOString(),
      review_start_date: input.review_start_date
        ? input.review_start_date.toISOString()
        : null,
      approval_date: input.approval_date
        ? input.approval_date.toISOString()
        : null,
      rejection_date: input.rejection_date
        ? input.rejection_date.toISOString()
        : null,
      seller: await EcommerceSellerAtSummaryTransformer.transform(input.seller),
      administrator: input.administrator
        ? await EcommerceAdministratorAtSummaryTransformer.transform(
            input.administrator,
          )
        : null,
    };
  }
}
