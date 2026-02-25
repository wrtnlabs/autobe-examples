import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditGuest";
import { IRedditGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditGuestGuests(props: {
  guest: GuestPayload;
  body: IRedditGuest.IRequest;
}): Promise<IPageIRedditGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const finalPage = Math.max(1, page);
  const finalLimit = Math.max(1, Math.min(limit, 100));
  const skip = (finalPage - 1) * finalLimit;
  const total = await MyGlobal.prisma.reddit_guests.count({
    where: { deleted_at: null },
  });
  const rawData = await MyGlobal.prisma.reddit_guests.findMany({
    where: { deleted_at: null },
    skip,
    take: finalLimit,
    orderBy: { created_at: "desc" },
  });
  const data = rawData.map(
    (guest) =>
      ({
        id: guest.id,
        device_id: guest.device_id,
        created_at: toISOStringSafe(guest.created_at),
        updated_at: toISOStringSafe(guest.updated_at),
      }) satisfies IRedditGuest.ISummary,
  );
  return {
    data,
    pagination: {
      current: finalPage,
      limit: finalLimit,
      records: total,
      pages: Math.ceil(total / finalLimit),
    },
  };
}
