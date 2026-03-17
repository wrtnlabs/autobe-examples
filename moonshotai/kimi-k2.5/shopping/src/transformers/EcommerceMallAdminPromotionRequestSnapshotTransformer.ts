import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdminAtSummaryTransformer } from "./EcommerceMallAdminAtSummaryTransformer";

export namespace EcommerceMallAdminPromotionRequestSnapshotTransformer {
  export type Payload =
    Prisma.ecommerce_mall_admin_promotion_request_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        adminPromotionRequest: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_admin_promotion_requestsFindManyArgs,
        previousReviewer: EcommerceMallAdminAtSummaryTransformer.select(),
        newReviewer: EcommerceMallAdminAtSummaryTransformer.select(),
        previous_status: true,
        new_status: true,
        previous_reason: true,
        new_reason: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_mall_admin_promotion_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdminPromotionRequestSnapshot> {
    return {
      id: input.id,
      adminPromotionRequestId: input.adminPromotionRequest.id,
      previousStatus: input.previous_status satisfies string as
        | "pending"
        | "approved"
        | "rejected",
      newStatus: input.new_status satisfies string as
        | "pending"
        | "approved"
        | "rejected",
      previousReason: input.previous_reason,
      newReason: input.new_reason,
      createdAt: toISOStringSafe(input.created_at),
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
