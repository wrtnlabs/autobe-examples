import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdminAdminCancellationRequestsCancellationRequestId(props: {
  admin: AdminPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.IUpdate;
}): Promise<IShoppingMallCancellationRequest> {
  const { cancellationRequestId } = props;
  const existing =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUnique({
      where: { id: cancellationRequestId },
    });
  if (existing === null) {
    throw new HttpException("Cancellation request not found", 404);
  }
  const update: Record<string, unknown> = {};
  const result =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.update({
      where: { id: cancellationRequestId },
      data: update as never,
    });
  return result as unknown as IShoppingMallCancellationRequest;
}
