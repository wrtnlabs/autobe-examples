import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsPushToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPushToken";
import { IPageICommunityBbsPushToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsPushToken";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function patchCommunityBbsCommunityMemberCommunityMembersUsernamePushTokens(props: {
  communityMember: CommunitymemberPayload;
  username: string;
  body: ICommunityBbsPushToken.IRequest;
}): Promise<IPageICommunityBbsPushToken.ISummary> {
  const { communityMember, username, body } = props;

  // Resolve member by username
  const member = await MyGlobal.prisma.community_bbs_communitymember.findUnique(
    {
      where: { username },
    },
  );
  if (!member) throw new HttpException("Not Found", 404);

  // Authorization: caller must be the resource owner
  if (member.id !== communityMember.id) {
    throw new HttpException("Unauthorized", 403);
  }

  // Validate operations array
  if (
    !body ||
    !Array.isArray(body.operations) ||
    body.operations.length === 0
  ) {
    throw new HttpException("Bad Request: operations required", 400);
  }

  await MyGlobal.prisma.$transaction(async (tx) => {
    for (const op of body.operations) {
      if (op.action === "upsert") {
        // Business validation for provider
        if (op.provider !== "fcm" && op.provider !== "apns")
          throw new HttpException("Bad Request: invalid provider", 400);

        const existing = await tx.community_bbs_push_tokens.findUnique({
          where: { token: op.token },
        });

        if (existing) {
          if (existing.community_member_id !== member.id) {
            throw new HttpException(
              "Conflict: token belongs to another user",
              409,
            );
          }

          await tx.community_bbs_push_tokens.update({
            where: { id: existing.id },
            data: {
              provider: op.provider,
              platform: op.platform ?? undefined,
              device_id: op.device_id ?? undefined,
              fingerprint: op.fingerprint ?? undefined,
              expired_at: op.expired_at
                ? toISOStringSafe(op.expired_at)
                : (existing.expired_at ?? null),
              revoked: false,
              last_seen: toISOStringSafe(new Date()),
            },
          });
        } else {
          await tx.community_bbs_push_tokens.create({
            data: {
              id: v4() as string & tags.Format<"uuid">,
              community_member_id: member.id,
              token: op.token,
              provider: op.provider,
              platform: op.platform ?? undefined,
              device_id: op.device_id ?? undefined,
              fingerprint: op.fingerprint ?? undefined,
              expired_at: op.expired_at ? toISOStringSafe(op.expired_at) : null,
              created_at: toISOStringSafe(new Date()),
              last_seen: null,
              revoked: false,
              created_by_ip: null,
            },
          });
        }
      } else if (op.action === "revoke") {
        const existing = await tx.community_bbs_push_tokens.findUnique({
          where: { token: op.token },
        });
        if (!existing) throw new HttpException("Not Found", 404);
        if (existing.community_member_id !== member.id) {
          throw new HttpException(
            "Conflict: token belongs to another user",
            409,
          );
        }

        await tx.community_bbs_push_tokens.update({
          where: { id: existing.id },
          data: {
            revoked: true,
            expired_at: existing.expired_at
              ? existing.expired_at
              : toISOStringSafe(new Date()),
          },
        });

        await tx.community_bbs_audit_logs.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            actor_type: "community_member",
            actor_id: member.id,
            entity: "push_token",
            action: "revoked",
            payload: JSON.stringify({ token: op.token }),
            created_at: toISOStringSafe(new Date()),
            updated_at: toISOStringSafe(new Date()),
          },
        });
      } else {
        throw new HttpException("Bad Request: invalid operation action", 400);
      }
    }
  });

  // Fetch all tokens for member and build summaries
  const tokens = await MyGlobal.prisma.community_bbs_push_tokens.findMany({
    where: { community_member_id: member.id },
    orderBy: { created_at: "desc" },
  });

  const profile = await MyGlobal.prisma.community_bbs_profiles.findUnique({
    where: { community_bbs_communitymember_id: member.id },
  });

  const data = tokens.map((t) => {
    // Narrow platform to exact union of allowed values: "android" | "ios" | "web" | null | undefined
    let platformValue: "android" | "ios" | "web" | null | undefined;
    if (t.platform === null) platformValue = null;
    else if (t.platform === undefined) platformValue = undefined;
    else if (
      t.platform === "android" ||
      t.platform === "ios" ||
      t.platform === "web"
    )
      platformValue = t.platform;
    else platformValue = undefined;

    // Narrow provider to exact union "fcm" | "apns"
    const providerValue: "fcm" | "apns" =
      t.provider === "fcm" || t.provider === "apns"
        ? (t.provider as "fcm" | "apns")
        : ((): "fcm" | "apns" => {
            throw new HttpException("Invalid provider value", 500);
          })();

    return {
      id: t.id,
      member: {
        id: member.id,
        username: member.username,
        display_name: profile ? (profile.display_name ?? null) : null,
        karma: member.karma,
        created_at: toISOStringSafe(member.created_at),
        updated_at: toISOStringSafe(member.updated_at),
      },
      device_id: t.device_id ?? undefined,
      provider: providerValue,
      platform: platformValue,
      last_seen: t.last_seen ? toISOStringSafe(t.last_seen) : null,
      created_at: toISOStringSafe(t.created_at),
      expired_at: t.expired_at ? toISOStringSafe(t.expired_at) : null,
      revoked: t.revoked,
      fingerprint: t.fingerprint ?? null,
      created_by_ip: t.created_by_ip ?? null,
    };
  });

  return {
    pagination: {
      current: Number(1),
      limit: Number(data.length),
      records: Number(data.length),
      pages: Number(data.length > 0 ? 1 : 0),
    },
    data,
  };
}
