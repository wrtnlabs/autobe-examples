import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
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

export async function putShoppingMallCustomerPaymentAttemptsPaymentAttemptId(props: {
  customer: CustomerPayload;
  paymentAttemptId: string & tags.Format<"uuid">;
  body: IShoppingMallPaymentAttempt.IUpdate;
}): Promise<IShoppingMallPaymentAttempt> {
  await MyGlobal.prisma.shopping_mall_payment_attempts.findFirstOrThrow({
    where: {
      id: props.paymentAttemptId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  throw new HttpException("Forbidden", 403);
}
