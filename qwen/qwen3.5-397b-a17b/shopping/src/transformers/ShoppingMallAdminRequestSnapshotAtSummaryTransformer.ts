import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRequestSnapshot";
import { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallSuperAdminAtSummaryTransformer } from "./ShoppingMallSuperAdminAtSummaryTransformer";

export namespace ShoppingMallAdminRequestSnapshotAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_admin_request_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        requested_at: true,
        responded_at: true,
        created_at: true,
        respondedBySuperAdmin:
          ShoppingMallSuperAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_admin_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdminRequestSnapshot.ISummary> {
    return {
      id: input.id,
      status: input.status,
      requested_at: input.requested_at.toISOString(),
      responded_at: input.responded_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      responder: input.respondedBySuperAdmin
        ? await ShoppingMallSuperAdminAtSummaryTransformer.transform(
            input.respondedBySuperAdmin,
          )
        : null,
    };
  }
}
