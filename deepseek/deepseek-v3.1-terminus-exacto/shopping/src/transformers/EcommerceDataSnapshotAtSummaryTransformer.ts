import { IEcommerceDataSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDataSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceDataSnapshotAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_data_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        entity_type: true,
        entity_id: true,
        change_description: true,
        data_before: true,
        data_after: true,
        created_at: true,
        updated_at: true,
        createdByCustomer: true,
        createdBySeller: true,
        createdByAdministrator: true,
        createdBySuperAdministrator: true,
      },
    } satisfies Prisma.ecommerce_data_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceDataSnapshot.ISummary> {
    return {
      id: input.id,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      change_description: input.change_description,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
