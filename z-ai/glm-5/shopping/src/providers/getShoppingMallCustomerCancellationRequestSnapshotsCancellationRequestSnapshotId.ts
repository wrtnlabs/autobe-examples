import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCancellationRequestSnapshotTransformer } from "../transformers/ShoppingMallCancellationRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerCancellationRequestSnapshotsCancellationRequestSnapshotId(props: {
  customer: CustomerPayload;
  cancellationRequestSnapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCancellationRequestSnapshot> {
  // Query snapshot using transformer's select for proper field selection
  const snapshot =
    await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.findUniqueOrThrow(
      {
        where: { id: props.cancellationRequestSnapshotId },
        ...ShoppingMallCancellationRequestSnapshotTransformer.select(),
      },
    );
  // Authorization: verify customer owns the order associated with this cancellation request
  // The snapshot includes cancellation_request -> orderItem -> order -> customer
  const orderCustomerId =
    snapshot.cancellationRequest.orderItem.order.customer?.id;
  if (orderCustomerId !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform using the transformer
  return await ShoppingMallCancellationRequestSnapshotTransformer.transform(
    snapshot,
  );
}
