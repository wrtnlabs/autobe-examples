import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotion";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdminAtSummaryTransformer } from "./EcommerceMallAdminAtSummaryTransformer";
import { EcommerceMallSuperAdminAtSummaryTransformer } from "./EcommerceMallSuperAdminAtSummaryTransformer";

export namespace EcommerceMallAdminPromotionTransformer {
  export type Payload = Prisma.ecommerce_mall_admin_promotionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action: true,
        reason: true,
        created_at: true,
        admin: EcommerceMallAdminAtSummaryTransformer.select(),
        performedBySuperAdmin:
          EcommerceMallSuperAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_admin_promotionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdminPromotion> {
    return {
      id: input.id,
      admin: await EcommerceMallAdminAtSummaryTransformer.transform(
        input.admin,
      ),
      performedBySuperAdmin:
        await EcommerceMallSuperAdminAtSummaryTransformer.transform(
          input.performedBySuperAdmin,
        ),
      action: input.action,
      reason: input.reason ?? null,
      createdAt: input.created_at.toISOString(),
    };
  }
}
