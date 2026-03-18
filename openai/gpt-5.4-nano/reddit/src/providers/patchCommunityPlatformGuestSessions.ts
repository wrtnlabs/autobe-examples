import { ICommunityPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { CommunityPlatformGuestSessionTransformer } from "../transformers/CommunityPlatformGuestSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformGuestSessions(props: {
  guest: GuestPayload;
  body: ICommunityPlatformGuestSession.IRequest;
}): Promise<ICommunityPlatformGuestSession> {
  const requestedExpiredAt = props.body.expired_at;
  const requestedDeletedAt = props.body.deleted_at;
  const nowIso: string & tags.Format<"date-time"> = "2026-03-18T11:29:19.041Z";
  const current =
    await MyGlobal.prisma.community_platform_guest_sessions.findUniqueOrThrow({
      where: { id: props.body.id },
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        updated_at: true,
        expired_at: true,
        deleted_at: true,
        guest: { select: { id: true } },
      },
    });
  if (current.guest.id !== props.guest.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (current.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  const currentExpiredAtIso = toISOStringSafe(current.expired_at);
  if (currentExpiredAtIso <= nowIso) {
    throw new HttpException("Forbidden", 403);
  }
  const nextData: {
    updated_at: typeof nowIso;
    expired_at?: typeof nowIso | undefined;
    deleted_at?: typeof nowIso | undefined;
  } = {
    updated_at: nowIso,
  };
  if (requestedExpiredAt !== undefined && requestedExpiredAt !== null) {
    nextData.expired_at = requestedExpiredAt;
  }
  if (requestedDeletedAt !== undefined && requestedDeletedAt !== null) {
    nextData.deleted_at = requestedDeletedAt;
  }
  const hasAnyRequestedField =
    (requestedExpiredAt !== undefined && requestedExpiredAt !== null) ||
    (requestedDeletedAt !== undefined && requestedDeletedAt !== null);
  if (hasAnyRequestedField) {
    await MyGlobal.prisma.$transaction(async (tx) => {
      await tx.community_platform_guest_sessions.update({
        where: { id: props.body.id },
        data: nextData,
      });
    });
  }
  const updated =
    await MyGlobal.prisma.community_platform_guest_sessions.findUniqueOrThrow({
      where: { id: props.body.id },
      ...CommunityPlatformGuestSessionTransformer.select(),
    });
  return await CommunityPlatformGuestSessionTransformer.transform(updated);
}
