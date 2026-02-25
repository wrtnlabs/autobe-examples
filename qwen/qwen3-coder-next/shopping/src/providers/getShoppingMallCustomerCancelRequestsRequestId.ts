import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallOrderCancellationRequestTransformer } from "../transformers/ShoppingMallOrderCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallCustomerCancelRequestsRequestId(props: {
  customer: CustomerPayload;
  requestId: string;
}): Promise<IShoppingMallOrderCancellationRequest> {
  const request =
    await MyGlobal.prisma.shopping_mall_order_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...ShoppingMallOrderCancellationRequestTransformer.select(),
      },
    );
  if (request.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await ShoppingMallOrderCancellationRequestTransformer.transform(
    request,
  );
}
