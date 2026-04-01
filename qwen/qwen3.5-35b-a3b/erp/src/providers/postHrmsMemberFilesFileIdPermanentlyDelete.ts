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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmsMemberFilesFileIdPermanentlyDelete(props: {
  member: MemberPayload;
  fileId: string & tags.Format<"uuid">;
}): Promise<IHrmsFile> {
  const { member, fileId } = props;
  // Retrieve file before deletion - only fetch scalar fields, not relations
  const file = await MyGlobal.prisma.hrms_files.findUniqueOrThrow({
    where: { id: fileId },
    select: {
      id: true,
      organization_id: true,
      owner_id: true,
      filename: true,
      storage_path: true,
      mime_type: true,
      file_size: true,
      file_category: true,
      owner_type: true,
      validation_status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Check authorization - verify member is in same organization
  const memberOrgMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: member.id,
        hrms_organization_id: file.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        hrms_organization_role_id: true,
        deleted_at: true,
      },
    });
  if (!memberOrgMember) {
    throw new HttpException("Forbidden", 403);
  }
  const role = await MyGlobal.prisma.hrms_organization_roles.findUnique({
    where: { id: memberOrgMember.hrms_organization_role_id },
  });
  const isAdminOrOwner = role?.name === "Owner" || role?.name === "Manager";
  if (!isAdminOrOwner) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate file not already soft-deleted
  if (file.deleted_at !== null) {
    throw new HttpException("File already deleted", 409);
  }
  // Check for pending uploads
  const activeUploads = await MyGlobal.prisma.hrms_file_uploads.findMany({
    where: {
      file_id: fileId,
      upload_state: {
        in: ["pending", "validating"],
      },
    },
  });
  if (activeUploads.length > 0) {
    throw new HttpException("File has pending uploads", 409);
  }
  // Validate not current organization logo
  if (file.file_category === "organization_logo") {
    throw new HttpException("Cannot delete current organization logo", 409);
  }
  // Validate not current user avatar
  if (file.file_category === "user_avatar" && file.owner_id !== null) {
    throw new HttpException("Cannot delete current user avatar", 409);
  }
  // Perform deletion transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.hrms_file_uploads.deleteMany({
      where: { file_id: fileId },
    });
    await tx.hrms_files.delete({
      where: { id: fileId },
    });
    await tx.hrms_activity_logs.create({
      data: {
        id: v4(),
        organization_id: file.organization_id,
        performed_by_id: member.id,
        created_at: new Date(),
        action_type: "FILE_DELETED",
        target_entity: "hrms_file",
        updated_at: new Date(),
      },
    });
  });
  // Build and return the deleted file response
  return {
    id: file.id,
    organization_id: file.organization_id,
    owner_id: file.owner_id ?? undefined,
    filename: file.filename,
    storage_path: file.storage_path,
    mime_type: file.mime_type,
    file_size: file.file_size,
    file_category: file.file_category,
    owner_type: file.owner_type ?? undefined,
    validation_status: file.validation_status,
    created_at: toISOStringSafe(file.created_at),
    updated_at: toISOStringSafe(file.updated_at),
    deleted_at: file.deleted_at ? toISOStringSafe(file.deleted_at) : null,
    organization: {
      id: file.organization_id,
      name: "",
      description: null,
      logo_uri: null,
      currency: "",
      timezone: "",
      fiscal_start_month: 1,
      owner: {
        id: "",
        email: "",
        display_name: "",
        avatar_uri: null,
        phone_number: null,
        organization_membership_count: 0 satisfies number & tags.Type<"int32">,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
        deleted_at: null,
      } satisfies IHrmsMember.ISummary,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    } satisfies IHrmsOrganization.ISummary,
    owner: null,
  } satisfies IHrmsFile;
}
