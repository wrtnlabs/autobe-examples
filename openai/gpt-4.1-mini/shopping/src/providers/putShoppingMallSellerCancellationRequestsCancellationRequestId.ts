import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerCancellationRequestsCancellationRequestId(props: {
  seller: SellerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.IUpdate;
}): Promise<IShoppingMallCancellationRequest> {
  const record =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUnique({
      where: { id: props.cancellationRequestId },
    });
  if (!record) {
    throw new HttpException("Cancellation request not found", 404);
  }
  const updated =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.update({
      where: { id: props.cancellationRequestId },
      data: {
        updated_at: toISOStringSafe(new Date()),
      },
    });
  return updated;
}
