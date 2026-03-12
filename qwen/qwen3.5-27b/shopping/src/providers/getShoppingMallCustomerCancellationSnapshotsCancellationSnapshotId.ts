import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCancellationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationSnapshot";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCancellationSnapshotTransformer } from "../transformers/ShoppingMallCancellationSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerCancellationSnapshotsCancellationSnapshotId(props: {
  customer: CustomerPayload;
  cancellationSnapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCancellationSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_cancellation_snapshots.findUniqueOrThrow(
      {
        where: { id: props.cancellationSnapshotId },
        ...ShoppingMallCancellationSnapshotTransformer.select(),
      },
    );
  // Authorization: verify the customer owns this cancellation request
  if (snapshot.cancellationRequest.customer.id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallCancellationSnapshotTransformer.transform(snapshot);
}
