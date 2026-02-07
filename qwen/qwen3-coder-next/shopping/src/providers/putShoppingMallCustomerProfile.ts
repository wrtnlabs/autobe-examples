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
  const { customer, body } = props;
  // Update customer profile information
  const updated = await MyGlobal.prisma.shopping_mall_customers.update({
    where: {
      id: customer.id,
      deleted_at: null,
    },
    data: {
      updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      phone_number: true,
      is_email_verified: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Transform database record to response DTO
  return {
    id: updated.id as string & tags.Format<"uuid">,
    email: updated.email,
    display_name: updated.display_name,
    phone_number:
      updated.phone_number === null ? undefined : updated.phone_number,
    is_email_verified: updated.is_email_verified,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
