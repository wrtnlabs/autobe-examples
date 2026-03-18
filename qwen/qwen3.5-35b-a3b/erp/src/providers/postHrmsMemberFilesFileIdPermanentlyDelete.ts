import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFile";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsFileTransformer } from "../transformers/HrmsFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmsMemberFilesFileIdPermanentlyDelete(props: {
  member: MemberPayload;
  fileId: string & tags.Format<"uuid">;
}): Promise<IHrmsFile> {
  const fileId = props.fileId;
  const member = props.member;
  // 1. Fetch the file record with required relations using transformer's select
  const file = await MyGlobal.prisma.hrms_files.findUniqueOrThrow({
    where: { id: fileId },
    ...HrmsFileTransformer.select(),
  });
  // 2. Validate file is not already deleted
  if (file.deleted_at !== null) {
    throw new HttpException("File is already deleted", 409);
  }
  // 3. Verify file belongs to member's organization
  const memberOrgMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: member.id,
        hrms_organization_id: file.organization.id,
        deleted_at: null,
      },
      include: {
        organizationRole: true,
      },
    });
  if (memberOrgMember === null) {
    throw new HttpException("You do not have access to this organization", 403);
  }
  // 4. Validate user has admin or owner role
  const role = memberOrgMember.organizationRole;
  const isOwner = role.is_builtin && role.name === "Owner";
  const isAdmin = role.is_builtin && role.name === "Manager";
  if (!isOwner && !isAdmin) {
    throw new HttpException(
      "Only organization owners and managers can delete files",
      403,
    );
  }
  // 5. Check for active file_uploads references
  const activeUploads = await MyGlobal.prisma.hrms_file_uploads.findMany({
    where: {
      file_id: fileId,
      upload_state: { in: ["pending", "validating"] },
    },
  });
  if (activeUploads.length > 0) {
    throw new HttpException("File is currently being uploaded", 409);
  }
  // 6. Check if file is active organization logo
  const currentLogo = await MyGlobal.prisma.hrms_files.findFirst({
    where: {
      organization_id: file.organization.id,
      file_category: "organization_logo",
      deleted_at: null,
    },
  });
  if (currentLogo !== null && currentLogo.id === fileId) {
    throw new HttpException("Cannot delete the organization logo", 409);
  }
  // 7. Check if file is active user avatar
  const currentUserAvatar = await MyGlobal.prisma.hrms_files.findFirst({
    where: {
      id: fileId,
      file_category: "user_avatar",
      owner_type: "member",
      deleted_at: null,
    },
  });
  if (currentUserAvatar !== null) {
    throw new HttpException("Cannot delete the user's active avatar", 409);
  }
  // Transform file to response before deletion
  const response = await HrmsFileTransformer.transform(file);
  // 8. Begin transaction and delete records
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete associated upload history
    await tx.hrms_file_uploads.deleteMany({
      where: {
        file_id: fileId,
      },
    });
    // Delete the file record
    await tx.hrms_files.delete({
      where: { id: fileId },
    });
  });
  // 9. Log activity
  const now = new Date();
  await MyGlobal.prisma.hrms_activity_logs.create({
    data: {
      id: v4(),
      organization_id: file.organization.id,
      performed_by_id: member.id,
      action_type: "file_permanently_deleted",
      target_id: fileId,
      target_entity: "file",
      details: JSON.stringify({
        file_id: fileId,
        filename: file.filename,
        file_category: file.file_category,
        deleted_by: member.id,
        deleted_at: now.toISOString(),
      }),
      created_at: now,
      updated_at: now,
    },
  });
  // 10. Return deleted file information
  return response;
}
