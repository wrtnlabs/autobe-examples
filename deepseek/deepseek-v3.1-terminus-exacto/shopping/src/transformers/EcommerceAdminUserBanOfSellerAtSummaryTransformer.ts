import { IEcommerceAdminUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfSeller";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceSellerAtSummaryTransformer } from "./EcommerceSellerAtSummaryTransformer";

export namespace EcommerceAdminUserBanOfSellerAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_administrative_action_of_sellersGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        intervention_type: true,
        suspension_duration_days: true,
        restriction_scope: true,
        effective_from: true,
        effective_until: true,
        seller: EcommerceSellerAtSummaryTransformer.select(),
        administrativeAction: true,
      },
    } satisfies Prisma.ecommerce_administrative_action_of_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceAdminUserBanOfSeller.ISummary> {
    return {
      id: input.id,
      intervention_type: input.intervention_type,
      suspension_duration_days: input.suspension_duration_days ?? null,
      restriction_scope: input.restriction_scope ?? null,
      effective_from: input.effective_from.toISOString(),
      effective_until: input.effective_until?.toISOString() ?? null,
      seller: await EcommerceSellerAtSummaryTransformer.transform(input.seller),
    };
  }
}
