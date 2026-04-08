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

export async function postEcommerceMallAuthCustomerJoin(props: {
  ip: string;
  body: IEcommerceMallCustomer.IJoin;
}): Promise<IEcommerceMallCustomer.IAuthorized> {
  // Check for duplicate email
  const existing = await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // Generate UUIDs with proper typing
  const customerId: string & tags.Format<"uuid"> = v4();
  const sessionId: string & tags.Format<"uuid"> = v4();
  // Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // Calculate timestamps as ISO strings
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // Create customer record
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.create({
    data: {
      id: customerId,
      email: props.body.email,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // Create session record
  const clientIp: string = props.body.ip ?? props.ip;
  await MyGlobal.prisma.ecommerce_mall_customer_sessions.create({
    data: {
      id: sessionId,
      ecommerce_mall_customer_id: customerId,
      ip: clientIp,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "customer",
        id: customerId,
        session_id: sessionId,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "customer",
        id: customerId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // For new registration, profile/address fields are empty/default
  const summary: IEcommerceMallCustomer.ISummary = {};
  return {
    id: customerId,
    recipientName: "",
    phoneNumber: "",
    streetAddress: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    isDefault: false,
    createdAt: customer.created_at,
    updatedAt: customer.updated_at,
    email: customer.email,
    displayName: "",
    customer: summary,
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
// export async function postEcommerceMallAuthCustomerJoin(props: {
//   ip: string;
//   body: IEcommerceMallCustomer.IJoin;
// }): Promise<IEcommerceMallCustomer.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------