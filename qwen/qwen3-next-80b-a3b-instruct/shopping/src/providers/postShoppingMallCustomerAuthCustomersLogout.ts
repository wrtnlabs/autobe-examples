import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerAuthCustomersLogout(props: {
  customer: CustomerPayload;
}): Promise<void> {
  await MyGlobal.prisma.shopping_mall_customer_sessions.update({
    where: { id: props.customer.session_id },
    data: {
      expired_at: toISOStringSafe(new Date()),
    },
  });
}
