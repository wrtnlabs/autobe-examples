import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
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

export async function postCommunityPlatformAdminCommunitiesCommunityIdBans(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBan.ICreate;
}): Promise<ICommunityPlatformCommunityBan> {
  const { admin, communityId, body } = props;
  // Validate UUIDs format are ensured by types
  // Extract userId from body to check uniqueness
  // Because ICommunityPlatformCommunityBan.ICreate schema is empty, userId is not directly available from DTO
  // But from ban context, we need userId to create a ban, so it is missing from input DTO
  // So we ask for userId separately from the user or clarify. Since not provided, cannot proceed.
  throw new HttpException(
    "ICommunityPlatformCommunityBan.ICreate schema lacks userId property; cannot proceed",
    400,
  );
}
