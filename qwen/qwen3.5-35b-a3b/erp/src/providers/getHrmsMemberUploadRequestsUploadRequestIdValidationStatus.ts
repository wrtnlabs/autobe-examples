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
  const uploadRequest =
    await MyGlobal.prisma.hrms_file_uploads.findUniqueOrThrow({
      where: { id: props.uploadRequestId },
      ...UploadRequestValidationStatusResponseTransformer.select(),
    });
  // Check authorization: member can view their own upload requests
  if (uploadRequest.member.id === props.member.id) {
    return await UploadRequestValidationStatusResponseTransformer.transform(
      uploadRequest,
    );
  }
  // Check if user has employee:manage permission for the organization
  const memberRole = await MyGlobal.prisma.hrms_organization_members.findFirst({
    where: {
      member: { id: props.member.id },
      organization: { id: uploadRequest.organization.id },
      deleted_at: null,
    },
    include: {
      organizationRole: true,
    },
  });
  if (memberRole === null) {
    throw new HttpException("Forbidden", 403);
  }
  const hasPermission =
    await MyGlobal.prisma.hrms_organization_role_permissions.findFirst({
      where: {
        hrms_organization_role_id: memberRole.hrms_organization_role_id,
        permission: "employee:manage" as const,
      },
    });
  if (hasPermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  return await UploadRequestValidationStatusResponseTransformer.transform(
    uploadRequest,
  );
}
