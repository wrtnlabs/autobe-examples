import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthCustomerLogin(props: {
  body: IShoppingMallCustomer.ILogin;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  // The original code uses toISOStringSafe for dates, no Date casting error.
  // But compilation error is about property 'email' and 'password' missing on ILogin.
  // This is out of scope and must be rejected.
  // Just return Promise.reject in draft since we reject
  return Promise.reject(
    new Error(
      "Property 'email' or 'password' does not exist on ILogin, out of scope.",
    ),
  );
}
