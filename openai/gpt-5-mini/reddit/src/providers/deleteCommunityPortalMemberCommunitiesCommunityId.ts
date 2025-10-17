import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPortalMemberCommunitiesCommunityId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, communityId } = props;

  // Fetch community; ensure it exists and is not already soft-deleted
  const community =
    await MyGlobal.prisma.community_portal_communities.findUnique({
      where: { id: communityId },
      select: {
        id: true,
        creator_user_id: true,
        deleted_at: true,
        name: true,
        slug: true,
        description: true,
        created_at: true,
      },
    });

  if (!community || community.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // Authorization: platform admin OR community creator OR active moderator
  const platformAdmin = await MyGlobal.prisma.community_portal_admins.findFirst(
    {
      where: { user_id: admin.id, is_active: true },
      select: { id: true },
    },
  );

  let authorized = false;

  if (platformAdmin) {
    authorized = true;
  } else if (
    community.creator_user_id !== null &&
    community.creator_user_id === admin.id
  ) {
    authorized = true;
  } else {
    const moderator =
      await MyGlobal.prisma.community_portal_moderators.findFirst({
        where: {
          user_id: admin.id,
          community_id: communityId,
          is_active: true,
        },
        select: { id: true },
      });

    if (moderator) authorized = true;
  }

  if (!authorized) {
    throw new HttpException(
      "Forbidden: You do not have permission to erase this community",
      403,
    );
  }

  // Perform soft-delete by setting deleted_at to current UTC timestamp
  const deletedAt = toISOStringSafe(new Date());

  try {
    await MyGlobal.prisma.community_portal_communities.update({
      where: { id: communityId },
      data: { deleted_at: deletedAt },
    });
  } catch (err) {
    throw new HttpException("Internal Server Error", 500);
  }

  // NOTE: Application-level actions must be executed outside this provider:
  // - Audit logging
  // - Notify subscribers
  // - Reassign or deactivate moderators
  // These operations intentionally omitted here to avoid referencing non-existent
  // schema/models or global services. Implement them in the calling layer or
  // via an event emitted after this function completes.

  return;
}
