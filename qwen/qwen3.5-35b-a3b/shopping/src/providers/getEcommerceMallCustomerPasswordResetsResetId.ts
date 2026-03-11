import { IEcommerceMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerPasswordReset";
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

export async function getEcommerceMallCustomerPasswordResetsResetId(props: {
  customer: CustomerPayload;
  resetId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCustomerPasswordReset> {
  const reset =
    await MyGlobal.prisma.ecommerce_mall_customer_password_resets.findUniqueOrThrow(
      {
        where: { id: props.resetId },
        select: {
          id: true,
          token: true,
          expired_at: true,
          created_at: true,
          customer: {
            select: {
              id: true,
            },
          } satisfies Prisma.ecommerce_mall_customersFindManyArgs,
        },
      },
    );
  if (reset.customer.id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: reset.id,
    customer_id: reset.customer.id,
    token: reset.token,
    expired_at: reset.expired_at.toISOString(),
    created_at: reset.created_at.toISOString(),
  } satisfies IEcommerceMallCustomerPasswordReset;
}
