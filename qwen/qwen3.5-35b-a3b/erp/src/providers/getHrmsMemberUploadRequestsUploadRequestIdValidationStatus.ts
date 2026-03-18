import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IUploadRequestValidationStatusResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IUploadRequestValidationStatusResponse";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { UploadRequestValidationStatusResponseTransformer } from "../transformers/UploadRequestValidationStatusResponseTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmsMemberUploadRequestsUploadRequestIdValidationStatus(props: {
  member: MemberPayload;
  uploadRequestId: string & tags.Format<"uuid">;
}): Promise<IUploadRequestValidationStatusResponse> {
  // Query the upload request record
  const upload = await MyGlobal.prisma.hrms_file_uploads.findUniqueOrThrow({
    where: { id: props.uploadRequestId },
    select: {
      id: true,
      organization_id: true,
      member_id: true,
      validation_status: true,
      upload_state: true,
      error_message: true,
      file_id: true,
      permanent_storage_path: true,
      created_at: true,
      updated_at: true,
      file: true,
    },
  });
  // Authorization check: member must own the upload or have manager/owner role in organization
  if (upload.member_id !== props.member.id) {
    // Check if member has manager or owner role in the organization
    const organizationMembership =
      await MyGlobal.prisma.hrms_organization_members.findFirst({
        where: {
          hrms_member_id: props.member.id,
          hrms_organization_id: upload.organization_id,
        },
      });
    if (organizationMembership === null) {
      throw new HttpException("Forbidden", 403);
    }
    // Get the role details using the foreign key
    const role = await MyGlobal.prisma.hrms_organization_roles.findUnique({
      where: { id: organizationMembership.hrms_organization_role_id },
    });
    // Check if role is Manager or Owner
    const roleIsManagerOrOwner =
      role?.name === "Manager" || role?.name === "Owner";
    if (!roleIsManagerOrOwner) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Transform and return the response
  return await UploadRequestValidationStatusResponseTransformer.transform(
    upload,
  );
}
