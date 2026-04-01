import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { ErpHrmTimeTrackingGuestSessionTransformer } from "../transformers/ErpHrmTimeTrackingGuestSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeTrackingGuestGuests(props: {
  guest: GuestPayload;
  body: IErpHrmTimeTrackingGuestSession.IRequest;
}): Promise<IErpHrmTimeTrackingGuestSession> {
  if (props.body.email.length === 0) {
    throw new HttpException("email is required", 400);
  }
  if (props.body.ip.length === 0) {
    throw new HttpException("ip is required", 400);
  }
  if (props.body.href.length === 0) {
    throw new HttpException("href is required", 400);
  }
  if (props.body.referrer.length === 0) {
    throw new HttpException("referrer is required", 400);
  }
  const nowIso = toISOStringSafe(new Date());
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const guest = await tx.erp_hrm_time_tracking_guests.findUnique({
      where: { email: props.body.email },
      select: { id: true, deleted_at: true },
    });
    const activeGuest =
      guest === null
        ? await tx.erp_hrm_time_tracking_guests.create({
            data: {
              id: v4() as string & tags.Format<"uuid">,
              email: props.body.email,
              password_hash: await PasswordUtil.hash(v4()),
              created_at: nowIso as string & tags.Format<"date-time">,
              updated_at: nowIso as string & tags.Format<"date-time">,
              deleted_at: null,
            },
            select: { id: true, deleted_at: true },
          })
        : guest;
    if (activeGuest.deleted_at !== null) {
      throw new HttpException("Guest identity is deleted", 403);
    }
    const session = await tx.erp_hrm_time_tracking_guest_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        erp_hrm_time_tracking_guest_id: activeGuest.id,
        ip: props.body.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: nowIso as string & tags.Format<"date-time">,
        expired_at: nowIso as string & tags.Format<"date-time">,
      },
      ...ErpHrmTimeTrackingGuestSessionTransformer.select(),
    });
    return await ErpHrmTimeTrackingGuestSessionTransformer.transform(session);
  });
}
