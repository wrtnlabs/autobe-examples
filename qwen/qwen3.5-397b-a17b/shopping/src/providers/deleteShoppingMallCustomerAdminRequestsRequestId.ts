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

export async function deleteShoppingMallCustomerAdminRequestsRequestId(props: {
  customer: CustomerPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<void> {
  const request =
    await MyGlobal.prisma.shopping_mall_admin_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      select: {
        id: true,
        shopping_mall_customer_id: true,
        status: true,
        deleted_at: true,
      },
    });
  if (request.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (request.status !== "PENDING") {
    throw new HttpException(
      "Cannot delete a request that has already been responded to",
      400,
    );
  }
  await MyGlobal.prisma.shopping_mall_admin_requests.update({
    where: { id: props.requestId },
    data: {
      deleted_at: new Date(),
    },
  });
}
