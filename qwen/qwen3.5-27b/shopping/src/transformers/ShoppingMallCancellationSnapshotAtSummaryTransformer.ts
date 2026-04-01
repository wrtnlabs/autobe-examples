import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCancellationSnapshotAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_cancellation_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_data: true,
        created_at: true,
        cancellationRequest: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_cancellation_requestsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_cancellation_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCancellationSnapshot.ISummary> {
    return {
      id: input.id,
      cancellationRequestId: input.cancellationRequest.id,
      createdAt: input.created_at.toISOString(),
    };
  }
}
