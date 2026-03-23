import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTrackerAuthGuestRefresh(props: {
  body: IHrmTrackerGuest.IRefresh;
}): Promise<IHrmTrackerGuest.IAuthorized> {
  const decoded = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY + "",
    { issuer: "autobe" },
  ) as jwt.JwtPayload;
  const guest = await MyGlobal.prisma.hrm_tracker_guests.findFirst({
    where: {
      id: decoded.id as string,
      device_fingerprint: props.body.device_fingerprint,
      deleted_at: null,
    },
    select: { id: true, device_fingerprint: true },
  });
  if (!guest) throw new HttpException("Guest not found", 404);
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const access = jwt.sign(
    {
      id: guest.id,
      session_id: guest.id,
      type: "guest",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY + "",
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      id: guest.id,
      session_id: guest.id,
      type: "guest",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY + "",
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.hrm_tracker_guests.update({
    where: { id: guest.id },
    data: { updated_at: now },
  });
  return {
    id: guest.id as string & tags.Format<"uuid">,
    device_fingerprint: guest.device_fingerprint,
    token: {
      access,
      refresh,
      expired_at: accessExpires.toISOString() as string &
        tags.Format<"date-time">,
      refreshable_until: refreshExpires.toISOString() as string &
        tags.Format<"date-time">,
    },
  } satisfies IHrmTrackerGuest.IAuthorized;
}
