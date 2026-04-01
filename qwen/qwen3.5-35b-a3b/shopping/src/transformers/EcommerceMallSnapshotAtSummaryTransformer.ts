import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
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
        snapshot_data: true,
        version: true,
        created_at: true,
        updated_at: true,
        actor: EcommerceMallCustomerAtSummaryTransformer.select(),
        entity: { select: { id: true } },
        orderItemProductSnapshots: { select: { id: true } },
        orderItemVariantSnapshots: { select: { id: true } },
        orderItemSellerSnapshots: { select: { id: true } },
        notificationOfAdminSnapshot: { select: { id: true } },
      },
    } satisfies Prisma.ecommerce_mall_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSnapshot.ISummary> {
    return {
      id: input.id,
      entity_type: input.entity_type,
      entity_id: input.entity.id,
      version: input.version,
      created_at: input.created_at.toISOString(),
      actor: input.actor
        ? await EcommerceMallCustomerAtSummaryTransformer.transform(input.actor)
        : null,
    };
  }
}
