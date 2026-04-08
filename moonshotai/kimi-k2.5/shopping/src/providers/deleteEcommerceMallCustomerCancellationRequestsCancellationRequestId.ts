import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallCustomerCancellationRequestsCancellationRequestId(props: {
  customer: CustomerPayload;
  cancellationRequestId: string;
}): Promise<void> {
  const cancellationRequest =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: {
          id: props.cancellationRequestId,
          deleted_at: null,
        },
        select: {
          id: true,
          customer_id: true,
          status: true,
        },
      },
    );
  if (cancellationRequest.customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (cancellationRequest.status !== "pending") {
    throw new HttpException("Forbidden", 403);
  }
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.ecommerce_mall_cancellation_requests.update({
    where: {
      id: props.cancellationRequestId,
    },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
