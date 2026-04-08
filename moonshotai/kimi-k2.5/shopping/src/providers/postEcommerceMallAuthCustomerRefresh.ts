import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthCustomerRefresh(props: {
  body: IEcommerceMallCustomer.IRefresh;
}): Promise<IEcommerceMallCustomer.IAuthorized> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const session =
    await MyGlobal.prisma.ecommerce_mall_customer_sessions.findUnique({
      where: { id: props.body.refresh },
      select: {
        id: true,
        ecommerce_mall_customer_id: true,
        expired_at: true,
        ip: true,
        href: true,
        referrer: true,
      },
    });
  if (!session) {
    throw new HttpException("Invalid refresh token", 401);
  }
  const sessionExpiredAt: string & tags.Format<"date-time"> = toISOStringSafe(
    session.expired_at,
  );
  if (sessionExpiredAt <= now) {
    throw new HttpException("Refresh token expired", 401);
  }
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.findUnique({
    where: { id: session.ecommerce_mall_customer_id },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }
  if (customer.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const newRefreshToken: string & tags.Format<"uuid"> = v4();
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  await MyGlobal.prisma.ecommerce_mall_customer_sessions.create({
    data: {
      id: newRefreshToken,
      ecommerce_mall_customer_id: customer.id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: now,
      expired_at: refreshExpires,
    },
  });
  await MyGlobal.prisma.ecommerce_mall_customer_sessions.delete({
    where: { id: session.id },
  });
  const accessToken: string = jwt.sign(
    {
      type: "customer",
      id: customer.id,
      session_id: newRefreshToken,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const orderCount: number = await MyGlobal.prisma.ecommerce_mall_orders.count({
    where: { ecommerce_mall_customer_id: customer.id },
  });
  const customerCreatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    customer.created_at,
  );
  const customerUpdatedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    customer.updated_at,
  );
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: newRefreshToken,
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  const customerDeletedAt: (string & tags.Format<"date-time">) | null =
    customer.deleted_at === null ? null : toISOStringSafe(customer.deleted_at);
  return {
    id: customer.id,
    email: customer.email,
    displayName: "",
    phoneNumber: "",
    recipientName: "",
    streetAddress: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    isDefault: false,
    createdAt: customerCreatedAt,
    updatedAt: customerUpdatedAt,
    customer: {
      id: customer.id,
      email: customer.email,
      displayName: "",
      createdAt: customerCreatedAt,
      deletedAt: customerDeletedAt,
      orderCount,
    },
    token,
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
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAuthCustomerRefresh(props: {
//   body: IEcommerceMallCustomer.IRefresh;
// }): Promise<IEcommerceMallCustomer.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------