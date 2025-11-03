import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsProfile";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function putCommunityBbsCommunityMemberCommunityMembersUsernameProfile(props: {
  communityMember: CommunitymemberPayload;
  username: string;
  body: ICommunityBbsProfile.IUpdate;
}): Promise<ICommunityBbsProfile> {
  const { communityMember, username, body } = props;

  // Resolve member by username
  const member = await MyGlobal.prisma.community_bbs_communitymember.findUnique(
    { where: { username } },
  );
  if (!member) throw new HttpException("Not Found", 404);
  if (member.deleted_at !== null)
    throw new HttpException("Conflict: Member is deleted", 409);

  // Authorization: only owner allowed (no moderator/admin payload available)
  if (communityMember.id !== member.id) {
    throw new HttpException(
      "Unauthorized: Only the profile owner may update their profile",
      403,
    );
  }

  // Load profile
  const profile = await MyGlobal.prisma.community_bbs_profiles.findFirst({
    where: { community_bbs_communitymember_id: member.id },
  });
  if (!profile) throw new HttpException("Not Found", 404);
  if (profile.deleted_at !== null)
    throw new HttpException("Conflict: Profile is deleted", 409);

  // Business validations
  if (body.display_name !== undefined && body.display_name !== null) {
    if (body.display_name.length > 100)
      throw new HttpException(
        "Bad Request: display_name must be at most 100 characters",
        400,
      );
  }
  if (body.bio !== undefined && body.bio !== null) {
    if (body.bio.length > 500)
      throw new HttpException(
        "Bad Request: bio must be at most 500 characters",
        400,
      );
  }

  if (body.avatar_uri !== undefined && body.avatar_uri !== null) {
    if (
      !(
        body.avatar_uri.startsWith("http://") ||
        body.avatar_uri.startsWith("https://")
      )
    ) {
      throw new HttpException(
        "Bad Request: avatar_uri must be an http(s) URI",
        400,
      );
    }
    const media = await MyGlobal.prisma.community_bbs_post_media.findFirst({
      where: { url: body.avatar_uri },
    });
    if (!media)
      throw new HttpException(
        "Bad Request: avatar_uri must reference existing platform-managed media",
        400,
      );
    if (media.moderation_status === "rejected")
      throw new HttpException(
        "Bad Request: avatar media has been rejected by moderation",
        400,
      );
  }

  const now = toISOStringSafe(new Date());

  // Update profile
  const updated = await MyGlobal.prisma.community_bbs_profiles.update({
    where: { id: profile.id },
    data: {
      display_name:
        body.display_name === undefined ? undefined : body.display_name,
      bio: body.bio === undefined ? undefined : body.bio,
      avatar_uri: body.avatar_uri === undefined ? undefined : body.avatar_uri,
      updated_at: now,
    },
  });

  // Build payload of changed fields for audit
  const changes: Record<string, unknown> = {};
  if (
    body.display_name !== undefined &&
    body.display_name !== profile.display_name
  ) {
    changes.display_name = {
      from: profile.display_name,
      to: body.display_name,
    };
  }
  if (body.bio !== undefined && body.bio !== profile.bio) {
    changes.bio = { from: profile.bio, to: body.bio };
  }
  if (body.avatar_uri !== undefined && body.avatar_uri !== profile.avatar_uri) {
    changes.avatar_uri = { from: profile.avatar_uri, to: body.avatar_uri };
  }

  await MyGlobal.prisma.community_bbs_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_type: "community_member",
      actor_id: communityMember.id,
      entity: "profile",
      action: "edited",
      payload: Object.keys(changes).length
        ? JSON.stringify({ changed: changes })
        : null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    member: {
      id: member.id,
      username: member.username,
      display_name: member.display_name ?? null,
      karma: Number(member.karma),
      created_at: toISOStringSafe(member.created_at),
      updated_at: toISOStringSafe(member.updated_at),
    },
    display_name:
      updated.display_name === null
        ? null
        : (updated.display_name ?? undefined),
    bio: updated.bio === null ? null : (updated.bio ?? undefined),
    avatar_uri:
      updated.avatar_uri === null ? null : (updated.avatar_uri ?? undefined),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
