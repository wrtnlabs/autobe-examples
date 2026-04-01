import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFile";
import { IHrmsFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFileUpload";
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
import { HrmsFileUploadTransformer } from "../transformers/HrmsFileUploadTransformer";
import { HrmsMemberAtSummaryTransformer } from "../transformers/HrmsMemberAtSummaryTransformer";
import { HrmsOrganizationAtSummaryTransformer } from "../transformers/HrmsOrganizationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsMemberUploadRequestsUploadRequestIdAssignOwnership(props: {
  member: MemberPayload;
  uploadRequestId: string & tags.Format<"uuid">;
  body: IHrmsFileUpload.IAssignOwnership;
}): Promise<IHrmsFileUpload> {
  const existing = await MyGlobal.prisma.hrms_file_uploads.findUniqueOrThrow({
    where: { id: props.uploadRequestId },
    select: {
      id: true,
      organization_id: true,
      member_id: true,
      file_id: true,
      original_filename: true,
      file_type: true,
      file_size: true,
      validation_status: true,
      temporary_storage_path: true,
      permanent_storage_path: true,
      upload_state: true,
      error_message: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      organization: HrmsOrganizationAtSummaryTransformer.select(),
      member: HrmsMemberAtSummaryTransformer.select(),
      file: HrmsFileTransformer.select(),
    },
  });
  const targetMember = await MyGlobal.prisma.hrms_members.findUniqueOrThrow({
    where: { id: props.body.member_id },
    select: {
      id: true,
      email: true,
      display_name: true,
      avatar_uri: true,
      phone_number: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const memberOrgMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        member: { id: targetMember.id },
        organization: { id: existing.organization_id },
        deleted_at: null,
      },
    });
  if (!memberOrgMember) {
    throw new HttpException(
      "Target member is not an active member of this organization",
      400,
    );
  }
  const currentMemberOrgMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        member: { id: props.member.id },
        organization: { id: existing.organization_id },
        deleted_at: null,
      },
    });
  if (!currentMemberOrgMember) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  const hasFileManage =
    await MyGlobal.prisma.hrms_organization_role_permissions.findFirst({
      where: {
        hrms_organization_role_id:
          currentMemberOrgMember.hrms_organization_role_id,
        permission: { equals: "file:manage" },
      },
    });
  const hasEmployeeManage =
    await MyGlobal.prisma.hrms_organization_role_permissions.findFirst({
      where: {
        hrms_organization_role_id:
          currentMemberOrgMember.hrms_organization_role_id,
        permission: { equals: "employee:manage" },
      },
    });
  if (!hasFileManage && !hasEmployeeManage) {
    throw new HttpException("Forbidden", 403);
  }
  const updated = await MyGlobal.prisma.hrms_file_uploads.update({
    where: { id: props.uploadRequestId },
    data: {
      member_id: props.body.member_id,
      upload_state: props.body.upload_state,
      validation_status: props.body.validation_status,
      error_message: props.body.error_message,
      permanent_storage_path: props.body.permanent_storage_path,
      updated_at: toISOStringSafe(new Date()),
    },
    ...HrmsFileUploadTransformer.select(),
  });
  return await HrmsFileUploadTransformer.transform(updated);
}
