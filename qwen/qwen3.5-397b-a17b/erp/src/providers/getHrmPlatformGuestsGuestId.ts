import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { IHrmPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformGuestTransformer } from "../transformers/HrmPlatformGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformGuestsGuestId(props: {
  guestId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformGuest> {
  const guest = await MyGlobal.prisma.hrm_platform_guests.findUniqueOrThrow({
    where: { id: props.guestId },
    ...HrmPlatformGuestTransformer.select(),
  });
  return await HrmPlatformGuestTransformer.transform(guest);
}
