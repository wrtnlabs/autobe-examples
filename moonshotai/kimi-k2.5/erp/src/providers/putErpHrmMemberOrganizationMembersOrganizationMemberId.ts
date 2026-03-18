import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmOrganizationMemberTransformer } from "../transformers/ErpHrmOrganizationMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberOrganizationMembersOrganizationMemberId(props: {
  member: MemberPayload;
  organizationMemberId: string & tags.Format<"uuid">;
  body: IErpHrmOrganizationMember.IUpdate;
}): Promise<IErpHrmOrganizationMember> {
  // Find target member first to get organization context
  const existingMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        id: props.organizationMemberId,
        deleted_at: null,
      },
      select: {
        id: true,
        is_active: true,
        organization_id: true,
      },
    });
  if (existingMember === null) {
    throw new HttpException("Organization member not found", 404);
  }
  const organizationId = existingMember.organization_id;
  // Verify caller belongs to this organization with active membership
  const callerMembership =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        user_id: props.member.id,
        organization_id: organizationId,
        deleted_at: null,
        is_active: true,
      },
      select: { id: true },
    });
  if (callerMembership === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate role_id if provided
  if (props.body.role_id !== undefined && props.body.role_id !== null) {
    const role = await MyGlobal.prisma.erp_hrm_roles.findFirst({
      where: {
        id: props.body.role_id,
        organization_id: organizationId,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (role === null) {
      throw new HttpException("Role not found in organization", 400);
    }
  }
  // Validate department_id if provided (null is allowed to clear assignment)
  if (
    props.body.department_id !== undefined &&
    props.body.department_id !== null
  ) {
    const department = await MyGlobal.prisma.erp_hrm_departments.findFirst({
      where: {
        id: props.body.department_id,
        organization_id: organizationId,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (department === null) {
      throw new HttpException("Department not found in organization", 400);
    }
  }
  // Build update data with only provided fields
  const updateData: Prisma.erp_hrm_organization_membersUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.role_id !== undefined) {
    if (props.body.role_id === null) {
      throw new HttpException("Role cannot be null", 400);
    }
    updateData.role = { connect: { id: props.body.role_id } };
  }
  if (props.body.department_id !== undefined) {
    if (props.body.department_id === null) {
      updateData.department = { disconnect: true };
    } else {
      updateData.department = { connect: { id: props.body.department_id } };
    }
  }
  if (props.body.position !== undefined) {
    updateData.position = props.body.position;
  }
  if (props.body.employment_type !== undefined) {
    updateData.employment_type = props.body.employment_type;
  }
  if (props.body.is_active !== undefined) {
    updateData.is_active = props.body.is_active;
  }
  // Execute the update
  await MyGlobal.prisma.erp_hrm_organization_members.update({
    where: { id: props.organizationMemberId },
    data: updateData,
  });
  // Fetch updated record with full relations
  const updatedMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findUniqueOrThrow({
      where: { id: props.organizationMemberId },
      ...ErpHrmOrganizationMemberTransformer.select(),
    });
  return await ErpHrmOrganizationMemberTransformer.transform(updatedMember);
}
