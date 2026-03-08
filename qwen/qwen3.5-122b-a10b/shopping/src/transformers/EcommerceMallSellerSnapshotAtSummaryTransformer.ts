import { IEcommerceMallSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSellerSnapshotAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_seller_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        previous_values: true,
        current_values: true,
        admin: {
          select: {
            email: true,
          },
        } satisfies Prisma.ecommerce_mall_adminsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_seller_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSellerSnapshot.ISummary> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      changed_by: input.admin?.email ?? null,
      previous_values: JSON.parse(input.previous_values) as {
        [key: string]: string;
      },
      current_values: JSON.parse(input.current_values) as {
        [key: string]: string;
      },
    };
  }
}
