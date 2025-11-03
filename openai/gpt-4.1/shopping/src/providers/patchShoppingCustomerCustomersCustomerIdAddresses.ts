import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCustomerAddress";
import { IPageIShoppingCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingCustomerAddress";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingCustomerCustomersCustomerIdAddresses(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  body: IShoppingCustomerAddress.IRequest;
}): Promise<IPageIShoppingCustomerAddress> {
  const { customer, customerId, body } = props;
  if (customer.id !== customerId) {
    throw new HttpException(
      "Forbidden: cannot view another customer's addresses",
      403,
    );
  }

  const includeDeleted = body.include_deleted === true;
  const where: Record<string, unknown> = {
    shopping_customer_id: customerId,
    ...(body.is_primary !== undefined && { is_primary: body.is_primary }),
    ...(includeDeleted ? {} : { deleted_at: null }),
  };

  const sortField = body.sort === "updated_at" ? "updated_at" : "created_at";
  const order = body.order === "asc" ? "asc" : "desc";
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_customer_addresses.findMany({
      where,
      orderBy: { [sortField]: order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_customer_addresses.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((addr) => ({
      id: addr.id,
      shopping_customer_id: addr.shopping_customer_id,
      address_line1: addr.address_line1,
      address_line2:
        addr.address_line2 === undefined
          ? undefined
          : (addr.address_line2 ?? null),
      city: addr.city,
      state: addr.state,
      postal_code: addr.postal_code,
      country: addr.country,
      is_primary: addr.is_primary,
      phone: addr.phone,
      recipient_name: addr.recipient_name,
      created_at: toISOStringSafe(addr.created_at),
      updated_at: toISOStringSafe(addr.updated_at),
      deleted_at:
        addr.deleted_at === undefined
          ? undefined
          : addr.deleted_at
            ? toISOStringSafe(addr.deleted_at)
            : null,
    })),
  };
}
