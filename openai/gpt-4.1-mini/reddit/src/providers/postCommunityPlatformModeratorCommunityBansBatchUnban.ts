import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";
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

export async function postCommunityPlatformModeratorCommunityBansBatchUnban(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformCommunityBan.IBatchUnbanRequest;
}): Promise<IPageICommunityPlatformCommunityBan.ISummary> {
  // IBatchUnbanRequest is an empty object type, so no ban IDs can be retrieved.
  // Throw HttpException indicating missing ban IDs to unban.
  throw new HttpException("No ban IDs provided for unbanning", 400);
}
