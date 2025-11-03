import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsPushToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPushToken";
import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function postCommunityBbsCommunityMemberCommunityMembersUsernamePushTokens(props: {
  communityMember: CommunitymemberPayload;
  username: string;
  body: ICommunityBbsPushToken.ICreate;
}): Promise<ICommunityBbsPushToken> {
  const { communityMember, username, body } = props;

  // Resolve target member by username
  const target = await MyGlobal.prisma.community_bbs_communitymember.findUnique(
    {
      where: { username },
      select: { id: true, deleted_at: true },
    },
  );
  if (!target) throw new HttpException("Not Found", 404);

  // Ownership check
  if (target.id !== communityMember.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Validate optional expired_at (business rule: must be future if provided)
  if (body.expired_at !== undefined && body.expired_at !== null) {
    const parsed = Date.parse(body.expired_at);
    if (Number.isNaN(parsed) || parsed <= Date.now()) {
      throw new HttpException(
        "Bad Request: expired_at must be a future ISO-8601 timestamp",
        400,
      );
    }
  }

  // Encrypt/hash the raw token for storage (treat token as sensitive)
  const tokenEncrypted = await PasswordUtil.hash(body.token);

  // Try to find existing record with same encrypted token
  const existing = await MyGlobal.prisma.community_bbs_push_tokens.findUnique({
    where: { token: tokenEncrypted },
  });

  // If token exists and belongs to another member -> conflict
  if (existing && existing.community_member_id !== target.id) {
    throw new HttpException("Conflict: token already claimed", 409);
  }

  // If exists and belongs to same member -> idempotent return (map fields)
  if (existing && existing.community_member_id === target.id) {
    return {
      id: existing.id,
      device_id: existing.device_id ?? undefined,
      provider: existing.provider as "fcm" | "apns",
      platform:
        existing.platform != null
          ? typia.assert<"android" | "ios" | "web">(existing.platform)
          : existing.platform,
      fingerprint: existing.fingerprint ?? undefined,
      last_seen: existing.last_seen
        ? toISOStringSafe(existing.last_seen)
        : undefined,
      created_at: toISOStringSafe(existing.created_at),
      expired_at: existing.expired_at
        ? toISOStringSafe(existing.expired_at)
        : null,
      revoked: existing.revoked,
      created_by_ip: existing.created_by_ip ?? undefined,
      deleted_at: existing.deleted_at
        ? toISOStringSafe(existing.deleted_at)
        : null,
    };
  }

  // Not existing -> create new record
  try {
    const now = toISOStringSafe(new Date());
    const created = await MyGlobal.prisma.community_bbs_push_tokens.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_member_id: target.id,
        device_id: body.device_id ?? null,
        token: tokenEncrypted,
        provider: body.provider,
        platform: body.platform ?? null,
        fingerprint: body.fingerprint ?? null,
        created_by_ip: null,
        expired_at: body.expired_at
          ? toISOStringSafe(body.expired_at as any)
          : null,
        revoked: false,
        created_at: now,
        deleted_at: null,
      },
    });

    return {
      id: created.id,
      device_id: created.device_id ?? undefined,
      provider: created.provider as "fcm" | "apns",
      platform:
        created.platform != null
          ? typia.assert<"android" | "ios" | "web">(created.platform)
          : created.platform,
      fingerprint: created.fingerprint ?? undefined,
      last_seen: created.last_seen
        ? toISOStringSafe(created.last_seen)
        : undefined,
      created_at: toISOStringSafe(created.created_at),
      expired_at: created.expired_at
        ? toISOStringSafe(created.expired_at)
        : null,
      revoked: created.revoked,
      created_by_ip: created.created_by_ip ?? undefined,
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : null,
    };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      // Unique constraint violation on token - re-check ownership
      const conflict =
        await MyGlobal.prisma.community_bbs_push_tokens.findUnique({
          where: { token: tokenEncrypted },
        });
      if (conflict && conflict.community_member_id !== target.id) {
        throw new HttpException("Conflict: token already claimed", 409);
      }

      if (conflict && conflict.community_member_id === target.id) {
        return {
          id: conflict.id,
          device_id: conflict.device_id ?? undefined,
          provider: conflict.provider as "fcm" | "apns",
          platform:
            conflict.platform != null
              ? typia.assert<"android" | "ios" | "web">(conflict.platform)
              : conflict.platform,
          fingerprint: conflict.fingerprint ?? undefined,
          last_seen: conflict.last_seen
            ? toISOStringSafe(conflict.last_seen)
            : undefined,
          created_at: toISOStringSafe(conflict.created_at),
          expired_at: conflict.expired_at
            ? toISOStringSafe(conflict.expired_at)
            : null,
          revoked: conflict.revoked,
          created_by_ip: conflict.created_by_ip ?? undefined,
          deleted_at: conflict.deleted_at
            ? toISOStringSafe(conflict.deleted_at)
            : null,
        };
      }
    }

    throw new HttpException("Internal Server Error", 500);
  }
}
