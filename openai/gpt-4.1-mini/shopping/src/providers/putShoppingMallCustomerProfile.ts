import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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

export async function putShoppingMallCustomerProfile(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomer.IUpdate;
}): Promise<IShoppingMallCustomer> {
  const id = props.customer.id;
  const updateData: Partial<{
    display_name: string | null;
    phone_number: string | null;
  }> = {};
  if ("display_name" in props.body) {
    const val = props.body.display_name;
    updateData.display_name =
      val === null || typeof val === "string" ? val : undefined;
  }
  if ("phone_number" in props.body) {
    const val = props.body.phone_number;
    updateData.phone_number =
      val === null || typeof val === "string" ? val : undefined;
  }
  const updated = await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id },
    data: updateData,
  });
  if (!updated) {
    throw new HttpException("Customer not found", 404);
  }
  return {
    id: updated.id,
    display_name: updated.display_name === null ? null : updated.display_name,
    email: updated.email,
    phone_number: updated.phone_number === null ? null : updated.phone_number,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
