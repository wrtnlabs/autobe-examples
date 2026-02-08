import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorCustomersCustomerId(props: {
  administrator: AdministratorPayload;
  customerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomer> {
  const { administrator, customerId } = props;
  // Authorization: allow only if requester is administrator OR customer themselves
  if (
    administrator.id !== customerId &&
    administrator.type !== "administrator"
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: customerId },
  });
  if (!customer || customer.deleted_at !== null) {
    throw new HttpException("Customer not found", 404);
  }
  // Helper to convert Date to ISO string with appropriate branded type
  function toIsoDateTimeString(date: Date): string & tags.Format<"date-time"> {
    return date.toISOString() as unknown as string & tags.Format<"date-time">;
  }
  return {
    id: customer.id,
    email: customer.email,
    display_name:
      customer.display_name === null ? undefined : customer.display_name,
    phone_number:
      customer.phone_number === null ? undefined : customer.phone_number,
    created_at: toIsoDateTimeString(customer.created_at),
    updated_at: toIsoDateTimeString(customer.updated_at),
    deleted_at:
      customer.deleted_at === null
        ? null
        : toIsoDateTimeString(customer.deleted_at),
  };
}
