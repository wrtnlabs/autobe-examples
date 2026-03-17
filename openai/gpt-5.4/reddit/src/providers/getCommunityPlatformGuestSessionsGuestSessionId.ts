import { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { ICommunityPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformGuestSessionTransformer } from "../transformers/CommunityPlatformGuestSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformGuestSessionsGuestSessionId(props: {
  guestSessionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformGuestSession> {
  const record =
    await MyGlobal.prisma.community_platform_guest_sessions.findUniqueOrThrow({
      where: {
        id: props.guestSessionId,
      },
      ...CommunityPlatformGuestSessionTransformer.select(),
    });
  return await CommunityPlatformGuestSessionTransformer.transform(record);
}
