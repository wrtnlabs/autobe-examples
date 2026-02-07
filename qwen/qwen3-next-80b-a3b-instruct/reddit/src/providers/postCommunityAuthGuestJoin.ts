import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityAuthGuestJoin(props: {
  body: ICommunityGuest.IJoin;
}): Promise<ICommunityGuest.IAuthorized> {
  // Generate unique device fingerprint
  const device_fingerprint = v4() as string & tags.Format<"uuid">;
  // Find existing non-deleted guest with this device fingerprint
  const existingGuest = await MyGlobal.prisma.community_guests.findFirst({
    where: {
      device_fingerprint,
      deleted_at: null,
    },
  });
  let guest: {
    id: string & tags.Format<"uuid">;
    device_fingerprint: string;
    created_at: string & tags.Format<"date-time">;
    updated_at: string & tags.Format<"date-time">;
    deleted_at: (string & tags.Format<"date-time">) | null;
  };
  if (existingGuest) {
    guest = {
      id: existingGuest.id as string & tags.Format<"uuid">,
      device_fingerprint: existingGuest.device_fingerprint,
      created_at: toISOStringSafe(existingGuest.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(existingGuest.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at: existingGuest.deleted_at
        ? (toISOStringSafe(existingGuest.deleted_at) as string &
            tags.Format<"date-time">)
        : null,
    };
  } else {
    const now = new Date();
    const createdGuest = await MyGlobal.prisma.community_guests.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        device_fingerprint,
        created_at: toISOStringSafe(now) as string & tags.Format<"date-time">,
        updated_at: toISOStringSafe(now) as string & tags.Format<"date-time">,
      },
    });
    guest = {
      id: createdGuest.id as string & tags.Format<"uuid">,
      device_fingerprint: createdGuest.device_fingerprint,
      created_at: toISOStringSafe(createdGuest.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(createdGuest.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at: createdGuest.deleted_at
        ? (toISOStringSafe(createdGuest.deleted_at) as string &
            tags.Format<"date-time">)
        : null,
    };
  }
  // Create session
  const sessionCreatedAt = new Date();
  const accessExpires = new Date(sessionCreatedAt.getTime() + 30 * 60 * 1000);
  const refreshExpires = new Date(
    sessionCreatedAt.getTime() + 30 * 24 * 60 * 60 * 1000,
  );
  const session = await MyGlobal.prisma.community_guest_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      community_guest_id: guest.id,
      ip: "unknown",
      href: "unknown",
      referrer: null,
      created_at: toISOStringSafe(sessionCreatedAt) as string &
        tags.Format<"date-time">,
      expired_at: toISOStringSafe(accessExpires) as string &
        tags.Format<"date-time">,
    },
  });
  // Generate JWT tokens
  const access = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: session.id,
      created_at: toISOStringSafe(sessionCreatedAt),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30m", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(sessionCreatedAt),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30d", issuer: "autobe" },
  );
  return {
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(accessExpires) as string &
        tags.Format<"date-time">,
      refreshable_until: toISOStringSafe(refreshExpires) as string &
        tags.Format<"date-time">,
    },
  } satisfies ICommunityGuest.IAuthorized;
}
