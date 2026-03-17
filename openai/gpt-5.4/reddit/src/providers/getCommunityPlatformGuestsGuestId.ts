import { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformGuestTransformer } from "../transformers/CommunityPlatformGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformGuestsGuestId(props: {
  guestId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformGuest> {
  const guest =
    await MyGlobal.prisma.community_platform_guests.findUniqueOrThrow({
      where: { id: props.guestId },
      ...CommunityPlatformGuestTransformer.select(),
    });
  return await CommunityPlatformGuestTransformer.transform(guest);
}
