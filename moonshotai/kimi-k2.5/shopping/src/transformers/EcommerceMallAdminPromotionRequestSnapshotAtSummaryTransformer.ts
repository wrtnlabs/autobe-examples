import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdminAtSummaryTransformer } from "./EcommerceMallAdminAtSummaryTransformer";

export namespace EcommerceMallAdminPromotionRequestSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_mall_admin_promotion_request_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        previous_status: true,
        new_status: true,
        previous_reason: true,
        new_reason: true,
        previousReviewer: EcommerceMallAdminAtSummaryTransformer.select(),
        newReviewer: EcommerceMallAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_admin_promotion_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdminPromotionRequestSnapshot.ISummary> {
    return {
      id: input.id,
      createdAt: input.created_at.toISOString(),
      previousStatus: input.previous_status,
      newStatus: input.new_status,
      previousReason: input.previous_reason ?? null,
      newReason: input.new_reason ?? null,
      previousReviewer: input.previousReviewer
        ? await EcommerceMallAdminAtSummaryTransformer.transform(
            input.previousReviewer,
          )
        : null,
      newReviewer: input.newReviewer
        ? await EcommerceMallAdminAtSummaryTransformer.transform(
            input.newReviewer,
          )
        : null,
    };
  }
}
