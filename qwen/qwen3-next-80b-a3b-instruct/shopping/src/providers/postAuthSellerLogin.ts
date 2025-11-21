import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthSellerLogin(props: {
  body: IShoppingMallSeller.IRequest;
}): Promise<IShoppingMallSeller.IAuthorized> {
  // The IRequest interface is misconfigured for login - it contains search parameters
  // instead of authentication credentials. The API contract is fundamentally broken.
  // According to the schema, IRequest only has: business_name, status, created_at_from,
  // created_at_to, updated_at_from, updated_at_to - none of which are suitable for login.

  // Since the schema doesn't provide email or password fields, we cannot authenticate.
  // This is a schema-definition error that must be fixed at the API contract level.
  // We cannot proceed with login without the required authentication parameters.

  // The only authentic option is to treat this as an unsupported operation
  // and provide a structured error response according to the available contract.

  throw new HttpException(
    "Authentication credentials not provided in request format",
    400,
  );
}
