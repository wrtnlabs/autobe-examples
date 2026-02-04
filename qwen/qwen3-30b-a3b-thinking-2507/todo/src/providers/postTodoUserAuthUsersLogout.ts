import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { INull } from "@ORGANIZATION/PROJECT-api/lib/structures/INull";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoUserAuthUsersLogout(props: {
  user: UserPayload;
}): Promise<INull> {
  // This endpoint is intentionally not implemented in the business API.
  // Session termination is exclusively handled by the authentication service.
  // Business domain services should never handle session state or authentication tokens.
  return {};
}
