import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
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

export async function postCommunityPlatformModeratorCommunityModerators(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformCommunityModerator.ICreate;
}): Promise<ICommunityPlatformCommunityModerator> {
  // Since props.body has no properties, throw explicit error to inform missing data
  throw new HttpException(
    "Request body must include community_id, community_moderator_id, and role fields",
    400,
  );
}
