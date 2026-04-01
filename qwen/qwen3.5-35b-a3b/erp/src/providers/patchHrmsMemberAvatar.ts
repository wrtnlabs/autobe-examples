import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsFileUploadRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFileUploadRequest";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsMemberTransformer } from "../transformers/HrmsMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsMemberAvatar(props: {
  member: MemberPayload;
  body: IHrmsFileUploadRequest;
}): Promise<IHrmsMember> {
  const { member, body } = props;
  // Generate unique filename and storage path
  const uniqueFilename = `${v4()}_${body.original_filename ?? "avatar"}`;
  const storagePath = `/avatars/${uniqueFilename}`;
  // Determine MIME type from file_type or infer from extension
  const fileExtension = body.original_filename
    ? body.original_filename.split(".").pop()?.toLowerCase()
    : undefined;
  let mimeType = body.file_type;
  if (!mimeType && fileExtension) {
    const mimeMap: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
    };
    mimeType = mimeMap[fileExtension] ?? "image/jpeg";
  }
  mimeType = mimeType ?? "image/jpeg";
  // Calculate file size from binary content
  const fileSize = Buffer.byteLength(body.file, "base64");
  // Execute transaction for atomic operations
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Get an organization from the member's organizations (required for multi-tenancy)
    const memberOrganizations = await tx.hrms_organization_members.findMany({
      where: { member: { id: member.id }, deleted_at: null },
      select: { hrms_organization_id: true },
      take: 1,
    });
    if (memberOrganizations.length === 0) {
      throw new HttpException(
        "Member must belong to at least one organization",
        400,
      );
    }
    const organizationId = memberOrganizations[0].hrms_organization_id;
    // Create new file record for the avatar
    const newFile = await tx.hrms_files.create({
      data: {
        id: v4(),
        organization_id: organizationId,
        owner_id: member.id,
        owner_type: "member",
        filename: body.original_filename ?? "avatar.png",
        storage_path: storagePath,
        mime_type: mimeType,
        file_size: fileSize,
        file_category: "user_avatar",
        validation_status: "validated",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    // Find and soft-delete any existing avatar for this member
    const existingAvatar = await tx.hrms_files.findFirst({
      where: {
        owner_id: member.id,
        owner_type: "member",
        file_category: "user_avatar",
        deleted_at: null,
      },
    });
    if (existingAvatar && existingAvatar.id !== newFile.id) {
      await tx.hrms_files.update({
        where: { id: existingAvatar.id },
        data: {
          deleted_at: new Date(),
          updated_at: new Date(),
        },
      });
    }
    // Update member with new avatar URI and get full member with organization memberships
    const updatedMember = await tx.hrms_members.update({
      where: { id: member.id },
      data: {
        avatar_uri: storagePath,
        updated_at: new Date(),
      },
      ...HrmsMemberTransformer.select(),
    });
    return { newFile, updatedMember };
  });
  return await HrmsMemberTransformer.transform(result.updatedMember);
}
