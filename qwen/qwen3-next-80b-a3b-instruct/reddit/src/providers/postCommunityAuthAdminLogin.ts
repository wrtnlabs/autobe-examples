import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
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

export async function postCommunityAuthAdminLogin(props: {
  body: ICommunityAdmin.ILogin;
}): Promise<ICommunityAdmin.IAuthorized> {
  // Since ICommunityAdmin.ILogin does not expose email, password, ip, href, referrer as top-level properties,
  // and we have no information about its internal structure, we cannot proceed with the given code.
  // This is a fundamental contract mismatch that requires knowledge of ILogin's internal structure.
  // Rejecting this implementation attempt as impossible with current information.
  throw new Error(
    "ICommunityAdmin.ILogin structure does not expose required properties: email, password, ip, href, referrer.",
  );
}
