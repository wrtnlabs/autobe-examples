import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistrationSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSellerRegistrationAtSummaryTransformer } from "./EcommerceMallSellerRegistrationAtSummaryTransformer";

export namespace EcommerceMallSellerRegistrationSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.ecommerce_mall_seller_registration_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        registration:
          EcommerceMallSellerRegistrationAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_seller_registration_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerRegistrationSnapshot.ISummary> {
    return {
      id: input.id,
      status: input.registration.status as "pending" | "approved" | "rejected",
      rejectionReason: input.registration.rejection_reason,
      createdAt: input.created_at.toISOString(),
      sellerRegistration:
        await EcommerceMallSellerRegistrationAtSummaryTransformer.transform(
          input.registration,
        ),
    };
  }
}
