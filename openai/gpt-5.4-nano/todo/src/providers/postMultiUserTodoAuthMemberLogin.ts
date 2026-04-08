import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoAuthMemberLogin(props: {
  ip: string;
  body: IMultiUserTodoUserProfile.ILogin;
}): Promise<IMultiUserTodoUserProfile.IAuthorized> {
  // Required data (member email->account mapping, password_hash storage, and session persistence)
  // is not present in the loaded database schemas for this project scope.
  // To avoid incorrect authentication behavior, return a safe server error.
  throw new HttpException("Member login is not configured", 500);
}
