import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallCancellationRequestSnapshotCollector {
  export async function collect(props: {
    reason: string;
    status: string;
    cancellationRequest: IEntity;
    body: IShoppingMallCancellationRequestSnapshot.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.reason,
      status: props.status,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      cancellationRequest: { connect: { id: props.cancellationRequest.id } },
    } satisfies Prisma.shopping_mall_cancellation_request_snapshotsCreateInput;
  }
}
