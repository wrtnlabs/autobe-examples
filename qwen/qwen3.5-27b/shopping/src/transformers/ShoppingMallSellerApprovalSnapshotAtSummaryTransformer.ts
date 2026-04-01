import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerApprovalSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerApprovalSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.shopping_mall_seller_approval_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_data: true,
        created_at: true,
      },
    } satisfies Prisma.shopping_mall_seller_approval_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerApprovalSnapshot.ISummary> {
    return {
      id: input.id,
      snapshot_data: input.snapshot_data,
      created_at: input.created_at.toISOString(),
    };
  }
}
