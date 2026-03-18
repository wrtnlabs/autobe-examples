import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { HrmTimeTrackingGuestTransformer } from "../transformers/HrmTimeTrackingGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingGuestGuests(props: {
  guest: GuestPayload;
}): Promise<IHrmTimeTrackingGuest> {
  if (props.guest.type !== "guest") {
    throw new HttpException("Forbidden", 403);
  }
  const guest =
    await MyGlobal.prisma.hrm_time_tracking_guests.findUniqueOrThrow({
      where: {
        id: props.guest.id,
        deleted_at: null,
      },
      ...HrmTimeTrackingGuestTransformer.select(),
    });
  return await HrmTimeTrackingGuestTransformer.transform(guest);
}
