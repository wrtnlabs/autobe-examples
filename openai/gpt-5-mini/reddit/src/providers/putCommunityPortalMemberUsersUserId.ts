import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putCommunityPortalMemberUsersUserId(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  body: ICommunityPortalUser.IUpdate;
}): Promise<ICommunityPortalUser.ISummary> {
  const { member, userId, body } = props;

  // Authorization: only the authenticated member may update their own profile
  if (member.id !== userId) {
    throw new HttpException(
      "Forbidden: You can only update your own profile",
      403,
    );
  }

  // Retrieve the user and ensure it exists and is not soft-deleted
  const user = await MyGlobal.prisma.community_portal_users.findUnique({
    where: { id: userId },
  });
  if (!user || user.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // Reject protected fields if the client attempted to include them
  const protectedFields = [
    "username",
    "email",
    "karma",
    "created_at",
    "deleted_at",
  ];
  const requestedKeys = Object.keys(body);
  const forbidden = requestedKeys.filter((k) => protectedFields.includes(k));
  if (forbidden.length > 0) {
    throw new HttpException(
      `Bad Request: Protected fields are not writable: ${forbidden.join(", ")}`,
      400,
    );
  }

  // NOTE: The ICommunityPortalUser.IUpdate DTO does not include 'password'.
  // The API description mentioned password hashing, but the DTO lacks that field.
  // Therefore, password changes are not implemented here. If password support
  // is required, extend the DTO and implement secure hashing with rate limits.

  // Prepare the updated_at timestamp once and reuse it
  const now = toISOStringSafe(new Date());

  // Apply update (inline data object to preserve clear type errors)
  const updated = await MyGlobal.prisma.community_portal_users.update({
    where: { id: userId },
    data: {
      display_name:
        body.display_name === undefined ? undefined : body.display_name,
      bio: body.bio === undefined ? undefined : body.bio,
      avatar_uri: body.avatar_uri === undefined ? undefined : body.avatar_uri,
      updated_at: now,
    },
  });

  // Audit: schema lacks an audit table; integrate with auditing pipeline here.
  // Example (commented):
  // await MyGlobal.audit.emit({ actor_id: member.id, target: 'community_portal_users', target_id: userId, action: 'update_profile', changes: requestedKeys, timestamp: now });

  return {
    id: updated.id,
    username: updated.username,
    display_name: updated.display_name === null ? null : updated.display_name,
    bio: updated.bio === null ? null : updated.bio,
    avatar_uri: updated.avatar_uri === null ? null : updated.avatar_uri,
    karma: updated.karma,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
