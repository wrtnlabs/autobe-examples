import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ECommerceMallCustomerTransformer } from "../transformers/ECommerceMallCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallAuthCustomerLogin(props: {
  ip: string;
  body: IECommerceMallCustomer.ILogin;
}): Promise<IECommerceMallCustomer.IAuthorized> {
  const customer = await MyGlobal.prisma.e_commerce_mall_customers.findFirst({
    where: { email: props.body.email },
    select: {
      ...ECommerceMallCustomerTransformer.select().select,
    },
  });
  if (customer === null) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (customer.banned_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (customer.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }
  const isValid = await PasswordUtil.verify(
    props.body.password,
    customer.password_hash,
  );
  if (isValid === false) {
    throw new HttpException("Invalid credentials", 401);
  }
  const nowMillis: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  const accessExpiresAt: Date = new Date(
    new Date(nowMillis).getTime() + 60 * 60 * 1000,
  );
  const refreshExpiresAt: Date = new Date(
    new Date(nowMillis).getTime() + 7 * 24 * 60 * 60 * 1000,
  );
  const sessionId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;
  await MyGlobal.prisma.e_commerce_mall_customer_sessions.create({
    data: {
      id: sessionId,
      e_commerce_mall_customer_id: customer.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: nowMillis,
      expired_at: accessExpiresAt.toISOString(),
    },
  });
  const accessToken: string = jwt.sign(
    {
      type: "customer",
      id: customer.id,
      session_id: sessionId,
      created_at: nowMillis,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken: string = jwt.sign(
    {
      type: "customer",
      id: customer.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: nowMillis,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const customerData: IECommerceMallCustomer =
    await ECommerceMallCustomerTransformer.transform(customer);
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiresAt.toISOString(),
    refreshable_until: refreshExpiresAt.toISOString(),
  };
  return {
    ...customerData,
    token,
  } satisfies IECommerceMallCustomer.IAuthorized;
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
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallAuthCustomerLogin(props: {
//   ip: string;
//   body: IECommerceMallCustomer.ILogin;
// }): Promise<IECommerceMallCustomer.IAuthorized> {
//   return {
//     id: ...,
//     email: ...,
//     profile: await ECommerceMallCustomerProfileTransformer.transform(...),
//     banned_at: ...,
//     created_at: ...,
//     updated_at: ...,
//     deleted_at: ...,
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------