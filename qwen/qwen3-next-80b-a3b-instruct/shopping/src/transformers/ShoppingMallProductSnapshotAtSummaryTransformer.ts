import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductSnapshotAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_usersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        is_active: true,
        user_type: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        productSnapshots: true,
        productVariantSnapshotsChangeds: true,
        cancellationResponses: true,
      },
    } satisfies Prisma.shopping_mall_usersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductSnapshot.ISummary> {
    const statusMap: Record<string, "suspended" | "active" | "deleted"> = {
      suspended: "suspended",
      active: "active",
      deleted: "deleted",
    };
    const normalizedStatus = statusMap[input.status] ?? "active";
    return {
      id: input.id,
      display_name: undefined,
      status: normalizedStatus,
    };
  }
}
