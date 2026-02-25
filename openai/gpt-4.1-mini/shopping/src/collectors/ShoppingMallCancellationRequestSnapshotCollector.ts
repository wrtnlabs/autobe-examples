import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallCancellationRequestSnapshotCollector {
  export async function collect(props: {
    body: IShoppingMallCancellationRequestSnapshot.ICreate;
  }) {
    const { cancellation_request_id, reason, status, created_at, updated_at } =
      props.body;
    const id: string = v4();
    return {
      id,
      reason,
      status,
      created_at: new Date(created_at),
      updated_at: new Date(updated_at),
      deleted_at: null,
      cancellationRequest: {
        connect: {
          id: cancellation_request_id,
        },
      },
    } satisfies Prisma.shopping_mall_cancellation_request_snapshotsCreateInput;
  }
}
