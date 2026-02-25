import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { CommunityPlatformUserSessionTransformer } from "../transformers/CommunityPlatformUserSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformGuestSessionsId(props: {
  guest: GuestPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformUserSession> {
  const session =
    await MyGlobal.prisma.community_platform_user_sessions.findUnique({
      where: { id: props.id },
      ...CommunityPlatformUserSessionTransformer.select(),
    });
  if (session === null) {
    throw new HttpException("Session not found", 404);
  }
  if (session.user.id !== props.guest.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await CommunityPlatformUserSessionTransformer.transform(session);
}
