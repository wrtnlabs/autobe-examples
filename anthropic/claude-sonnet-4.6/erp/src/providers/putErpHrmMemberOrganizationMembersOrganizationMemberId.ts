import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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
  // Step 1: Look up the target organization member record
  const targetMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findUnique({
      where: { id: props.organizationMemberId },
      select: {
        id: true,
        organization_id: true,
        deleted_at: true,
      },
    });
  if (targetMember === null || targetMember.deleted_at !== null) {
    throw new HttpException("Organization member not found", 404);
  }
  // Step 2: Find the requesting member's OrganizationMember record within the same organization
  const requesterMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: targetMember.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        role_id: true,
      },
    });
  if (requesterMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Verify the requesting member has employee:manage permission
  const managePermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        role_id: requesterMember.role_id,
        permission_code: "employee:manage",
      },
      select: { id: true },
    });
  if (managePermission === null) {
    throw new HttpException(
      "Forbidden: employee:manage permission required",
      403,
    );
  }
  // Step 4: Validate employment_type if provided
  const validEmploymentTypes = [
    "full-time",
    "part-time",
    "contractor",
    "intern",
  ];
  if (
    props.body.employment_type !== undefined &&
    !validEmploymentTypes.includes(props.body.employment_type)
  ) {
    throw new HttpException(
      `Invalid employment_type: must be one of ${validEmploymentTypes.join(", ")}`,
      422,
    );
  }
  // Step 5: Validate department_id if provided and non-null
  if (
    props.body.department_id !== undefined &&
    props.body.department_id !== null
  ) {
    const department = await MyGlobal.prisma.erp_hrm_departments.findFirst({
      where: {
        id: props.body.department_id,
        organization_id: targetMember.organization_id,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (department === null) {
      throw new HttpException(
        "Invalid department_id: department does not exist or does not belong to the organization",
        422,
      );
    }
  }
  // Step 6: Build and apply the update using Prisma relation syntax for department
  const departmentUpdate =
    props.body.department_id === undefined
      ? {}
      : props.body.department_id === null
        ? { department: { disconnect: true } }
        : { department: { connect: { id: props.body.department_id } } };
  await MyGlobal.prisma.erp_hrm_organization_members.update({
    where: { id: props.organizationMemberId },
    data: {
      ...(props.body.employment_type !== undefined && {
        employment_type: props.body.employment_type,
      }),
      ...(props.body.position !== undefined && {
        position: props.body.position,
      }),
      ...departmentUpdate,
      updated_at: new Date(),
    },
  });
  // Step 7: Return the updated record using the transformer
  const updated =
    await MyGlobal.prisma.erp_hrm_organization_members.findUniqueOrThrow({
      where: { id: props.organizationMemberId },
      ...ErpHrmOrganizationMemberTransformer.select(),
    });
  return ErpHrmOrganizationMemberTransformer.transform(updated);
}
