import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";

export namespace EcommerceMallSnapshotAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        entity_type: true,
        entity_id: true,
        version: true,
        created_at: true,
        updated_at: true,
        snapshot_data: true,
        actor: EcommerceMallCustomerAtSummaryTransformer.select(),
        entity: true,
        orderItemProductSnapshots: true,
        orderItemVariantSnapshots: true,
        orderItemSellerSnapshots: true,
        notificationOfAdminSnapshot: true,
      },
    } satisfies Prisma.ecommerce_mall_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSnapshot.ISummary> {
    return {
      id: input.id,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      version: input.version,
      created_at: toISOStringSafe(input.created_at),
      actor: input.actor
        ? await EcommerceMallCustomerAtSummaryTransformer.transform(input.actor)
        : null,
    };
  }
}
