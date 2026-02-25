import { IEcommerceDataSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDataSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceDataSnapshotTransformer {
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
        createdByCustomer: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_customersFindManyArgs,
        createdBySeller: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_sellersFindManyArgs,
        createdByAdministrator: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_administratorsFindManyArgs,
        createdBySuperAdministrator: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_super_administratorsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_data_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceDataSnapshot> {
    return {
      id: input.id,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      change_description: input.change_description,
      data_before: input.data_before,
      data_after: input.data_after,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      created_by_customer_id: input.createdByCustomer?.id ?? undefined,
      created_by_seller_id: input.createdBySeller?.id ?? undefined,
      created_by_administrator_id:
        input.createdByAdministrator?.id ?? undefined,
      created_by_super_administrator_id:
        input.createdBySuperAdministrator?.id ?? undefined,
    };
  }
}
