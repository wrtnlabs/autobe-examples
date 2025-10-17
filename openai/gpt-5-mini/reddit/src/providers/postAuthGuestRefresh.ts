import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthGuestRefresh(props: {
  body: ICommunityPortalGuest.IRefresh;
}): Promise<ICommunityPortalGuest.IAuthorized> {
  const { body } = props;

  // 1) Find the guest session by token
  const guest = await MyGlobal.prisma.community_portal_guests.findFirst({
    where: { guest_token: body.guest_token },
  });

  if (!guest) throw new HttpException("Unauthorized: invalid guest token", 401);

  // 2) Verify expiry (if expiry is set)
  if (guest.expired_at && guest.expired_at.getTime() <= Date.now()) {
    throw new HttpException("Unauthorized: guest token expired", 401);
  }

  // 3) If bound to a user, ensure the member is not suspended
  if (guest.user_id) {
    const member = await MyGlobal.prisma.community_portal_members.findUnique({
      where: { user_id: guest.user_id },
    });
    if (member && member.is_suspended) {
      throw new HttpException("Forbidden: associated member suspended", 403);
    }
  }

  // 4) Rotate guest token and compute new expiry
  const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  const newGuestToken = v4() as string & tags.Format<"uuid">;
  const newExpiryIso = toISOStringSafe(new Date(Date.now() + TTL_MS));

  const updated = await MyGlobal.prisma.community_portal_guests.update({
    where: { id: guest.id },
    data: {
      guest_token: newGuestToken,
      // store as Date in DB; conversion to string for responses is handled via toISOStringSafe
      expired_at: new Date(Date.now() + TTL_MS),
    },
  });

  // 5) Generate authorization JWTs (access + refresh) and expiry metadata
  const ACCESS_MS = 60 * 60 * 1000; // 1 hour
  const accessExpiryIso = toISOStringSafe(new Date(Date.now() + ACCESS_MS));

  const access = jwt.sign(
    { guest_id: updated.id, type: "guest" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refresh = jwt.sign(
    {
      guest_id: updated.id,
      type: "guest",
      guest_token: updated.guest_token ?? newGuestToken,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // 6) Build and return the authorized response
  return {
    id: updated.id as string & tags.Format<"uuid">,
    user_id: updated.user_id as unknown as string & tags.Format<"uuid">,
    guest_token: (updated.guest_token ?? newGuestToken) as string &
      tags.Format<"uuid">,
    created_at: toISOStringSafe(updated.created_at),
    expired_at: updated.expired_at ? toISOStringSafe(updated.expired_at) : null,
    token: {
      access,
      refresh,
      expired_at: accessExpiryIso,
      refreshable_until: newExpiryIso,
    },
  };
}
