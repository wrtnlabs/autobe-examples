import { IAvatarImageResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IAvatarImageResponse";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmsMemberAvatarUserId(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IAvatarImageResponse> {
  // Verify the target user exists
  const targetUser = await MyGlobal.prisma.hrms_members.findUniqueOrThrow({
    where: {
      id: props.userId,
      deleted_at: null,
    },
  });
  // Get the requesting member's organization membership context
  const requestingMembership =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (requestingMembership === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify data isolation - target user must be in an organization the requester has access to
  const targetUserMembership =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.userId,
        deleted_at: null,
      },
    });
  if (targetUserMembership === null) {
    throw new HttpException("User has no organization membership", 404);
  }
  // Check if both users share at least one organization
  const hasOrganizationAccess =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_organization_id: requestingMembership.hrms_organization_id,
        hrms_member_id: props.userId,
        deleted_at: null,
      },
    });
  if (hasOrganizationAccess === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Query for the user's avatar file
  const avatarFile = await MyGlobal.prisma.hrms_files.findFirst({
    where: {
      owner_id: props.userId,
      file_category: "user_avatar",
      validation_status: "validated",
      deleted_at: null,
    },
  });
  const defaultAvatarUri: string &
    tags.Format<"uri"> &
    tags.ContentMediaType<"image/png"> =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  if (avatarFile !== null) {
    const avatarUri: string &
      tags.Format<"uri"> &
      (
        | tags.ContentMediaType<"image/png">
        | tags.ContentMediaType<"image/jpeg">
      ) = avatarFile.storage_path;
    return {
      avatar_uri: avatarUri,
      default_avatar: false,
    };
  }
  return {
    avatar_uri: defaultAvatarUri,
    default_avatar: true,
  };
}
