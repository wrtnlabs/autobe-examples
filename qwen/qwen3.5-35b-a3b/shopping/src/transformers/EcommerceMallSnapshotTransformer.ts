import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSnapshot";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSnapshotTransformer {
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
        actor: {
          select: {
            id: true,
            email: true,
            status: true,
            created_at: true,
            deleted_at: true,
          },
        } satisfies Prisma.ecommerce_mall_customersFindManyArgs,
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
  ): Promise<IEcommerceMallSnapshot> {
    return {
      id: input.id,
      entity_id: input.entity_id,
      entity_type: input.entity_type,
      snapshot_data: input.snapshot_data,
      version: input.version,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      actor_id: input.actor?.id ?? null,
      actor: input.actor ?? (null as IEcommerceMallSnapshot["actor"]),
      entity: input.entity as unknown as IEcommerceMallSnapshot["entity"],
    };
  }
}
