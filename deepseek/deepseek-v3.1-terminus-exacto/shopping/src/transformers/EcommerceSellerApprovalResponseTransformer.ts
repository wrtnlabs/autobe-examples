import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommercePlatformEventOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfSeller";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSellerApprovalResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApprovalResponse";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceAdministratorAtSummaryTransformer } from "./EcommerceAdministratorAtSummaryTransformer";
import { EcommercePlatformEventOfSellerAtSummaryTransformer } from "./EcommercePlatformEventOfSellerAtSummaryTransformer";

export namespace EcommerceSellerApprovalResponseTransformer {
  export type Payload = Prisma.ecommerce_seller_approval_responsesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        decision: true,
        reason: true,
        responded_at: true,
        created_at: true,
        updated_at: true,
        sellerApprovalQueue:
          EcommercePlatformEventOfSellerAtSummaryTransformer.select(),
        administrator: EcommerceAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_seller_approval_responsesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceSellerApprovalResponse> {
    return {
      id: input.id,
      decision: input.decision as "approved" | "rejected",
      reason: input.reason ?? null,
      responded_at: input.responded_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      sellerApprovalQueue:
        await EcommercePlatformEventOfSellerAtSummaryTransformer.transform(
          input.sellerApprovalQueue,
        ),
      administrator: await EcommerceAdministratorAtSummaryTransformer.transform(
        input.administrator,
      ),
    };
  }
}
