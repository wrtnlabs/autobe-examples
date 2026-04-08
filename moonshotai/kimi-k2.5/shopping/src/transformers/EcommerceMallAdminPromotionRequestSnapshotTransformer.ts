import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import { IEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequestSnapshot";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdminPromotionRequestAtSummaryTransformer } from "./EcommerceMallAdminPromotionRequestAtSummaryTransformer";
import { EcommerceMallSuperAdminAtSummaryTransformer } from "./EcommerceMallSuperAdminAtSummaryTransformer";

export namespace EcommerceMallAdminPromotionRequestSnapshotTransformer {
  export type Payload =
    Prisma.ecommerce_mall_admin_promotion_request_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        previous_status: true,
        new_status: true,
        new_reason: true,
        created_at: true,
        previous_reason: true,
        adminPromotionRequest:
          EcommerceMallAdminPromotionRequestAtSummaryTransformer.select(),
        previousReviewer: EcommerceMallSuperAdminAtSummaryTransformer.select(),
        newReviewer: EcommerceMallSuperAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_admin_promotion_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdminPromotionRequestSnapshot> {
    return {
      id: input.id,
      adminPromotionRequestId: (
        await EcommerceMallAdminPromotionRequestAtSummaryTransformer.transform(
          input.adminPromotionRequest,
        )
      ).id,
      previousStatus: input.previous_status,
      currentStatus: input.new_status,
      reviewedBySuperAdminId: input.newReviewer?.id ?? null,
      reason: input.new_reason ?? null,
      createdAt: input.created_at.toISOString(),
      adminPromotionRequest:
        await EcommerceMallAdminPromotionRequestAtSummaryTransformer.transform(
          input.adminPromotionRequest,
        ),
      reviewedBySuperAdmin: input.newReviewer
        ? await EcommerceMallSuperAdminAtSummaryTransformer.transform(
            input.newReviewer,
          )
        : null,
    };
  }
}
