import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCancellationRequestTransformer } from "../transformers/ShoppingMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerCancellationRequestsCancellationRequestId(props: {
  customer: CustomerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCancellationRequest> {
  const request =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: {
          id: props.cancellationRequestId,
          customer_id: props.customer.id,
          deleted_at: null,
        },
        ...ShoppingMallCancellationRequestTransformer.select(),
      },
    );
  const snapshots =
    await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.findMany(
      {
        where: {
          cancellation_request_id: props.cancellationRequestId,
        },
        orderBy: {
          changed_at: "asc",
        },
      },
    );
  const transformed =
    await ShoppingMallCancellationRequestTransformer.transform(request);
  return typia.assert<IShoppingMallCancellationRequest>({
    ...transformed,
    snapshots: snapshots.map((snapshot) => ({
      id: snapshot.id,
      status: snapshot.status,
      reason: snapshot.reason,
      response_reason: snapshot.response_reason ?? null,
      changed_at: toISOStringSafe(snapshot.changed_at),
      changed_by: snapshot.changed_by,
    })),
  });
}
