import { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformModeratorCommunitiesCommunityIdBannedUsersUnban(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBannedUser.IRequest;
}): Promise<ICommunityPlatformCommunityBannedUser> {
  return typia.random<ICommunityPlatformCommunityBannedUser>();
}
