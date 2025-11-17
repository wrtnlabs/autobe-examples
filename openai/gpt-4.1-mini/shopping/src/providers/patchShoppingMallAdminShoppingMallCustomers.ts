import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminShoppingMallCustomers(props: {
  admin: AdminPayload;
  body: IShoppingMallCustomer.IRequest;
}): Promise<IPageIShoppingMallCustomer.ISummary> {
  const { email, createdAtStart, createdAtEnd, page, pageSize } = props.body;

  const where = {
    ...(email ? { email: { contains: email } } : {}),
    ...(createdAtStart || createdAtEnd
      ? {
          created_at: {
            ...(createdAtStart ? { gte: createdAtStart } : {}),
            ...(createdAtEnd ? { lte: createdAtEnd } : {}),
          },
        }
      : {}),
  };

  const skip = (page - 1) * pageSize;

  const [customers, count] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customers.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        email: true,
        created_at: true,
        // Name field is not stored. As a placeholder, use local part of email before '@'.
      },
    }),
    MyGlobal.prisma.shopping_mall_customers.count({ where }),
  ]);

  const data = customers.map((customer) => {
    const name = customer.email.split("@")[0];

    return {
      id: customer.id,
      email: customer.email as string & tags.Format<"email">,
      name,
    };
  });

  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: count,
      pages: Math.ceil(count / pageSize),
    },
    data,
  };
}
