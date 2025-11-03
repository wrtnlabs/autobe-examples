import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsNotificationPreference";
import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function putCommunityBbsCommunityMemberCommunityMembersUsernameNotificationPreferences(props: {
  communityMember: CommunitymemberPayload;
  username: string;
  body: ICommunityBbsNotificationPreference.IUpdate;
}): Promise<ICommunityBbsNotificationPreference> {
  const { communityMember, username, body } = props;

  // Resolve member by username
  const member = await MyGlobal.prisma.community_bbs_communitymember.findUnique(
    {
      where: { username },
    },
  );
  if (!member) throw new HttpException("Not Found", 404);

  // Authorization: only the owner may update
  if (communityMember.id !== member.id) {
    throw new HttpException(
      "Unauthorized: You can only update your own preferences",
      403,
    );
  }

  // Business validation: email_frequency
  if (body.email_frequency !== undefined && body.email_frequency !== null) {
    const allowed = ["immediate", "hourly", "daily"] as const;
    if (!allowed.includes(body.email_frequency)) {
      throw new HttpException("Bad Request: Invalid email_frequency", 400);
    }
  }

  // Business validation: enabling email requires verified email
  if (body.email === true && member.email_verified === false) {
    throw new HttpException("EMAIL_NOT_VERIFIED", 400);
  }

  const now = toISOStringSafe(new Date());

  // Determine soft-unsubscribe/reactivate intent
  const setsInApp = body.in_app !== undefined;
  const setsEmail = body.email !== undefined;
  const setsPush = body.push !== undefined;

  const explicitlyAllFalse =
    (setsInApp ? body.in_app === false : false) &&
    (setsEmail ? body.email === false : false) &&
    (setsPush ? body.push === false : false);

  const explicitlyAnyTrue =
    (setsInApp && body.in_app === true) ||
    (setsEmail && body.email === true) ||
    (setsPush && body.push === true);

  // Upsert logic: find existing preferences
  const existing =
    await MyGlobal.prisma.community_bbs_notification_preferences.findUnique({
      where: { community_member_id: member.id },
    });

  let updated = null;

  if (existing) {
    updated =
      await MyGlobal.prisma.community_bbs_notification_preferences.update({
        where: { community_member_id: member.id },
        data: {
          ...(body.in_app !== undefined && { in_app: body.in_app }),
          ...(body.email !== undefined && { email: body.email }),
          ...(body.push !== undefined && { push: body.push }),
          ...(body.email_frequency !== undefined && {
            email_frequency: body.email_frequency,
          }),
          ...(body.digest_hour !== undefined
            ? { digest_hour: body.digest_hour }
            : {}),
          ...(explicitlyAllFalse && { deleted_at: now }),
          ...(!explicitlyAllFalse && explicitlyAnyTrue && { deleted_at: null }),
          updated_at: now,
        },
      });
  } else {
    updated =
      await MyGlobal.prisma.community_bbs_notification_preferences.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          community_member_id: member.id,
          in_app: body.in_app ?? false,
          email: body.email ?? false,
          push: body.push ?? false,
          email_frequency: body.email_frequency ?? "daily",
          digest_hour: body.digest_hour ?? null,
          created_at: now,
          updated_at: now,
          deleted_at: explicitlyAllFalse ? now : null,
        },
      });
  }

  // Create audit log
  await MyGlobal.prisma.community_bbs_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_type: "community_member",
      actor_id: communityMember.id,
      entity: "notification_preferences",
      action: "update",
      payload: JSON.stringify({ changed: Object.keys(body) }),
      created_at: now,
      updated_at: now,
    },
  });

  // Map Prisma result -> DTO (convert Date -> ISO strings)
  return {
    id: updated.id as string & tags.Format<"uuid">,
    community_member_id: updated.community_member_id,
    in_app: updated.in_app,
    email: updated.email,
    push: updated.push,
    email_frequency: typia.assert<"immediate" | "hourly" | "daily" | undefined>(
      updated.email_frequency as unknown,
    ),
    digest_hour: updated.digest_hour === null ? null : updated.digest_hour,
    created_at: updated.created_at ? toISOStringSafe(updated.created_at) : null,
    updated_at: updated.updated_at ? toISOStringSafe(updated.updated_at) : null,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
