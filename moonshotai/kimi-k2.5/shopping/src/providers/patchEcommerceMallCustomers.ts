import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomers(props: {
  body: IEcommerceMallCustomer.IRequest;
}): Promise<IPageIEcommerceMallCustomer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_customersWhereInput = {
    deleted_at: null,
  };
  if (props.body.search) {
    whereInput.email = {
      contains: props.body.search,
      mode: "insensitive" as const,
    };
  }
  const customers = await MyGlobal.prisma.ecommerce_mall_customers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      email: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_customers.count({
    where: whereInput,
  });
  return {
    data: customers.map((customer) => ({
      id: customer.id as string & tags.Format<"uuid">,
      email: customer.email,
      created_at: toISOStringSafe(customer.created_at) as string &
        tags.Format<"date-time">,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallCustomers(props: {
//   body: IEcommerceMallCustomer.IRequest;
// }): Promise<IPageIEcommerceMallCustomer.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------