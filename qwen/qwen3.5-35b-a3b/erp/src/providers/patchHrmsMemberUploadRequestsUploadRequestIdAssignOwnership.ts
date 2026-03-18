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
import { HrmsFileUploadTransformer } from "../transformers/HrmsFileUploadTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsMemberUploadRequestsUploadRequestIdAssignOwnership(props: {
  member: MemberPayload;
  uploadRequestId: string & tags.Format<"uuid">;
  body: IHrmsFileUpload.IAssignOwnership;
}): Promise<IHrmsFileUpload> {
  const uploadRequest =
    await MyGlobal.prisma.hrms_file_uploads.findUniqueOrThrow({
      where: { id: props.uploadRequestId },
      ...HrmsFileUploadTransformer.select(),
    });
  const organizationMembership =
    await MyGlobal.prisma.hrms_organization_members.findFirstOrThrow({
      where: {
        hrms_organization_id: uploadRequest.organization.id,
        hrms_member_id: props.member.id,
      },
    });
  const role = await MyGlobal.prisma.hrms_organization_roles.findFirstOrThrow({
    where: { id: organizationMembership.hrms_organization_role_id },
    include: { permissions: true },
  });
  const permissions = role.permissions.map((p) => p.permission);
  const hasFileManagePermission = permissions.includes("file:manage");
  const hasEmployeeManagePermission = permissions.includes("employee:manage");
  if (!hasFileManagePermission && !hasEmployeeManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  const targetMember = await MyGlobal.prisma.hrms_members.findFirstOrThrow({
    where: {
      id: props.body.member_id,
      deleted_at: null,
    },
  });
  const targetOrganizationMembership =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_organization_id: uploadRequest.organization.id,
        hrms_member_id: props.body.member_id,
      },
    });
  if (!targetOrganizationMembership) {
    throw new HttpException(
      "Target member is not part of this organization",
      400,
    );
  }
  const targetEmployee = await MyGlobal.prisma.hrms_employees.findFirst({
    where: {
      organization_member_id: targetOrganizationMembership.id,
    },
  });
  if (!targetEmployee || targetEmployee.status !== "active") {
    throw new HttpException(
      "Target member does not have active employment status",
      400,
    );
  }
  const updateData: Prisma.hrms_file_uploadsUpdateInput = {
    member: { connect: { id: props.body.member_id } },
    updated_at: new Date(),
  } satisfies Prisma.hrms_file_uploadsUpdateInput;
  if (props.body.upload_state !== undefined) {
    updateData.upload_state = props.body.upload_state;
  }
  if (props.body.validation_status !== undefined) {
    updateData.validation_status = props.body.validation_status;
  }
  if (props.body.error_message !== undefined) {
    updateData.error_message = props.body.error_message;
  }
  if (props.body.permanent_storage_path !== undefined) {
    updateData.permanent_storage_path = props.body.permanent_storage_path;
  }
  const updatedUploadRequest = await MyGlobal.prisma.hrms_file_uploads.update({
    where: { id: props.uploadRequestId },
    data: updateData,
    ...HrmsFileUploadTransformer.select(),
  });
  return await HrmsFileUploadTransformer.transform(updatedUploadRequest);
}
