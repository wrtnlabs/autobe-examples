import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationSnapshot";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceAdministratorAtSummaryTransformer } from "./EcommerceAdministratorAtSummaryTransformer";
import { EcommerceSellerAtSummaryTransformer } from "./EcommerceSellerAtSummaryTransformer";

export namespace EcommerceCacheConfigurationSnapshotAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_admin_seller_suspensionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        suspension_reason: true,
        suspension_start_date: true,
        suspension_end_date: true,
        status: true,
        seller: EcommerceSellerAtSummaryTransformer.select(),
        administrator: EcommerceAdministratorAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_admin_seller_suspensionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceCacheConfigurationSnapshot.ISummary> {
    return {
      id: input.id,
      suspension_reason: input.suspension_reason,
      suspension_start_date: input.suspension_start_date.toISOString(),
      suspension_end_date: input.suspension_end_date
        ? input.suspension_end_date.toISOString()
        : null,
      status: input.status,
      seller: await EcommerceSellerAtSummaryTransformer.transform(input.seller),
      administrator: await EcommerceAdministratorAtSummaryTransformer.transform(
        input.administrator,
      ),
    };
  }
}
