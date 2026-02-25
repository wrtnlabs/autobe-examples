import { IEcommerceCustomerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceCustomerProfileSnapshotAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_customer_profile_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        phone_number: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customerProfile: true,
      },
    } satisfies Prisma.ecommerce_customer_profile_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceCustomerProfileSnapshot.ISummary> {
    return {
      id: input.id,
      display_name: input.display_name ?? undefined,
      phone_number: input.phone_number ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
