import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallGuestSessionTransformer } from "../transformers/EcommerceMallGuestSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminGuestsGuestIdSessions(props: {
  admin: AdminPayload;
  guestId: string & tags.Format<"uuid">;
  body: IEcommerceMallGuest.IRefresh;
}): Promise<IEcommerceMallGuestSession> {
  // Validate guest exists
  await MyGlobal.prisma.ecommerce_mall_guests.findUniqueOrThrow({
    where: { id: props.guestId },
    select: { id: true },
  });
  // Find active session for this guest
  const existingSession =
    await MyGlobal.prisma.ecommerce_mall_guest_sessions.findFirst({
      where: {
        ecommerce_mall_guest_id: props.guestId,
        expired_at: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
      },
    });
  if (existingSession === null) {
    throw new HttpException("Guest session not found or expired", 404);
  }
  // Calculate new expiry date (7 days from now)
  const newExpiredAt = new Date();
  newExpiredAt.setDate(newExpiredAt.getDate() + 7);
  // Update session with new expiry
  const updatedSession =
    await MyGlobal.prisma.ecommerce_mall_guest_sessions.update({
      where: { id: existingSession.id },
      data: {
        expired_at: newExpiredAt,
      },
      ...EcommerceMallGuestSessionTransformer.select(),
    });
  return await EcommerceMallGuestSessionTransformer.transform(updatedSession);
}
