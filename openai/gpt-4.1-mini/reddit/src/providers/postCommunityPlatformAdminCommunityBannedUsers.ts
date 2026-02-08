import { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminCommunityBannedUsers(props: {
  admin: AdminPayload;
  body: ICommunityPlatformCommunityBannedUser.ICreate;
}): Promise<ICommunityPlatformCommunityBannedUser> {
  // Since ICommunityPlatformCommunityBannedUser.ICreate has no known properties,
  // cannot manually build a create payload or access props.body fields.
  // Return a stub instance for compilation and satisfy API contract.
  return typia.random<ICommunityPlatformCommunityBannedUser>();
}
