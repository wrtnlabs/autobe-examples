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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postCommunityPlatformModeratorAuthModeratorsLogout(props: {
  moderator: ModeratorPayload;
}): Promise<void> {
  await MyGlobal.prisma.community_platform_moderator_sessions.deleteMany({
    where: {
      id: props.moderator.session_id,
    },
  });
}
