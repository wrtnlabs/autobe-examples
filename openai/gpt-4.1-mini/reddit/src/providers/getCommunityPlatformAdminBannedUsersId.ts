import { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformBannedUserTransformer } from "../transformers/CommunityPlatformBannedUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminBannedUsersId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformBannedUser> {
  const bannedUserRecord =
    await MyGlobal.prisma.community_platform_banned_users.findUniqueOrThrow({
      where: { id: props.id },
      ...CommunityPlatformBannedUserTransformer.select(),
    });
  return CommunityPlatformBannedUserTransformer.transform(bannedUserRecord);
}
