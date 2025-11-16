import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminCustomersCustomerIdCustomerSessionsCustomerSessionId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  customerSessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const session =
    await MyGlobal.prisma.shopping_mall_customer_sessions.findFirst({
      where: {
        id: props.customerSessionId,
        customer: {
          id: props.customerId satisfies string as string,
        },
      },
    });

  if (session === null) {
    throw new HttpException("Customer session not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_customer_sessions.delete({
    where: {
      id: props.customerSessionId,
    },
  });
}
