import { ICommunityPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { CommunityPlatformGuestSessionTransformer } from "../transformers/CommunityPlatformGuestSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformGuestSessionsSessionId(props: {
  guest: GuestPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformGuestSession> {
  // authorization + query will be filled by generator
  const session =
    await MyGlobal.prisma.community_platform_guest_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      ...CommunityPlatformGuestSessionTransformer.select(),
    });
  return await CommunityPlatformGuestSessionTransformer.transform(session);
}
