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

export async function getCommunityBbsCommunityMemberCommunityMembersUsernameNotificationPreferences(props: {
  communityMember: CommunitymemberPayload;
  username: string;
}): Promise<ICommunityBbsNotificationPreference> {
  const { communityMember, username } = props;

  try {
    // Resolve member by username
    const member =
      await MyGlobal.prisma.community_bbs_communitymember.findUnique({
        where: { username },
        select: { id: true, deleted_at: true },
      });

    if (!member || member.deleted_at) {
      throw new HttpException("Not Found", 404);
    }

    // Authorization: only the owner may retrieve their preferences
    if (communityMember.id !== member.id) {
      throw new HttpException(
        "Unauthorized: You can only view your own preferences",
        403,
      );
    }

    // Fetch preferences by member id
    const prefs =
      await MyGlobal.prisma.community_bbs_notification_preferences.findUnique({
        where: { community_member_id: member.id },
        select: {
          id: true,
          community_member_id: true,
          in_app: true,
          email: true,
          push: true,
          email_frequency: true,
          digest_hour: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });

    if (!prefs) {
      // Application defaults when no preferences row exists
      return {
        community_member_id: member.id,
        in_app: true,
        email: false,
        push: false,
        email_frequency: undefined,
        digest_hour: undefined,
        created_at: undefined,
        updated_at: undefined,
        deleted_at: undefined,
      } as ICommunityBbsNotificationPreference;
    }

    return {
      id: prefs.id ?? undefined,
      community_member_id: prefs.community_member_id,
      in_app: prefs.in_app,
      email: prefs.email,
      push: prefs.push,
      // Validate/convert primitive string into the literal union at property level
      email_frequency: typia.assert<
        "immediate" | "hourly" | "daily" | undefined
      >(prefs.email_frequency ?? undefined),
      // digest_hour is optional+nullable in DTO: return null if DB null, undefined if not provided
      digest_hour:
        prefs.digest_hour === null ? null : (prefs.digest_hour ?? undefined),
      created_at: prefs.created_at
        ? toISOStringSafe(prefs.created_at)
        : undefined,
      updated_at: prefs.updated_at
        ? toISOStringSafe(prefs.updated_at)
        : undefined,
      // If deleted_at exists (suppressed), surface its ISO string; otherwise undefined
      deleted_at: prefs.deleted_at
        ? toISOStringSafe(prefs.deleted_at)
        : undefined,
    } as ICommunityBbsNotificationPreference;
  } catch (e) {
    if (e instanceof HttpException) throw e;
    throw new HttpException("Internal Server Error", 500);
  }
}
