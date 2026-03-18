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
  const requestedMember = await MyGlobal.prisma.hrms_members.findUniqueOrThrow({
    where: { id: props.userId },
    select: { id: true },
  });
  // Get organization IDs for the requested member
  const requestedOrgIds =
    await MyGlobal.prisma.hrms_organization_members.findMany({
      where: { hrms_member_id: requestedMember.id },
      select: { hrms_organization_id: true },
    });
  if (requestedOrgIds.length === 0) {
    throw new HttpException("Access denied", 403);
  }
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        hrms_organization_id: {
          in: requestedOrgIds.map((org) => org.hrms_organization_id),
        },
      },
      select: { hrms_organization_id: true },
    });
  if (organizationMember === null) {
    throw new HttpException("Access denied", 403);
  }
  const avatarFile = await MyGlobal.prisma.hrms_files.findFirst({
    where: {
      owner_id: props.userId,
      file_category: "user_avatar",
      validation_status: "validated",
      deleted_at: null,
    },
    select: { storage_path: true },
  });
  if (avatarFile !== null) {
    return {
      avatar_uri: avatarFile.storage_path,
      default_avatar: false,
    };
  }
  return {
    avatar_uri: "https://cdn.example.com/default-avatar.png",
    default_avatar: true,
  };
}
