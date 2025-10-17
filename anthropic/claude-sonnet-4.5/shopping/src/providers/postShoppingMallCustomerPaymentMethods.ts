import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerPaymentMethods(props: {
  customer: CustomerPayload;
  body: IShoppingMallPaymentMethod.ICreate;
}): Promise<IShoppingMallPaymentMethod> {
  const { customer, body } = props;

  const paymentMethodId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const existingMethodsCount =
    await MyGlobal.prisma.shopping_mall_payment_methods.count({
      where: {
        shopping_mall_customer_id: customer.id,
        deleted_at: null,
      },
    });

  const isDefault = existingMethodsCount === 0;

  const customerRecord =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: customer.id },
      select: { name: true },
    });

  const created = await MyGlobal.prisma.shopping_mall_payment_methods.create({
    data: {
      id: paymentMethodId,
      shopping_mall_customer_id: customer.id,
      payment_type: body.payment_type,
      payment_gateway: "stripe",
      gateway_token: body.gateway_token,
      billing_name: customerRecord.name,
      is_default: isDefault,
      is_expired: false,
      created_at: now,
      updated_at: now,
    },
    select: {
      id: true,
      payment_type: true,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    payment_type: created.payment_type,
  };
}
