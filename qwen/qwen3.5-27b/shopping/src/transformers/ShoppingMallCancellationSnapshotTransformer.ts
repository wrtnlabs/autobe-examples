import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCancellationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationSnapshot";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCancellationRequestAtSummaryTransformer } from "./ShoppingMallCancellationRequestAtSummaryTransformer";

export namespace ShoppingMallCancellationSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_cancellation_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_data: true,
        created_at: true,
        cancellationRequest:
          ShoppingMallCancellationRequestAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_cancellation_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCancellationSnapshot> {
    return {
      id: input.id,
      shoppingMallCancellationRequestId: input.cancellationRequest.id,
      snapshotData: input.snapshot_data,
      createdAt: input.created_at.toISOString(),
      cancellationRequest:
        await ShoppingMallCancellationRequestAtSummaryTransformer.transform(
          input.cancellationRequest,
        ),
    };
  }
}
