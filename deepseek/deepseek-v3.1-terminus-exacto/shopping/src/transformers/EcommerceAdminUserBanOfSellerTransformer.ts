import { IEcommerceAdminUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfSeller";
import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMetadataRegistryRelationshipAtSummaryTransformer } from "./EcommerceMetadataRegistryRelationshipAtSummaryTransformer";
import { EcommerceSellerAtSummaryTransformer } from "./EcommerceSellerAtSummaryTransformer";

export namespace EcommerceAdminUserBanOfSellerTransformer {
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
        administrativeAction:
          EcommerceMetadataRegistryRelationshipAtSummaryTransformer.select(),
        seller: EcommerceSellerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_administrative_action_of_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceAdminUserBanOfSeller> {
    return {
      id: input.id,
      intervention_type: input.intervention_type,
      suspension_duration_days: input.suspension_duration_days ?? null,
      restriction_scope: input.restriction_scope ?? null,
      effective_from: toISOStringSafe(input.effective_from),
      effective_until: input.effective_until
        ? toISOStringSafe(input.effective_until)
        : null,
      administrativeAction:
        await EcommerceMetadataRegistryRelationshipAtSummaryTransformer.transform(
          input.administrativeAction,
        ),
      seller: await EcommerceSellerAtSummaryTransformer.transform(input.seller),
    };
  }
}
