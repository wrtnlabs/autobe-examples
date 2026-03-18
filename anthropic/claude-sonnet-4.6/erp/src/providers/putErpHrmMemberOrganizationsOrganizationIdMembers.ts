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

export async function putErpHrmMemberOrganizationsOrganizationIdMembers(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmOrganizationMember.IUpdate;
}): Promise<IErpHrmOrganizationMember> {
  // 1. Find the caller's own org member record in the specified organization
  const callerMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        organization_id: props.organizationId,
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        role: {
          select: {
            name: true,
            is_builtin: true,
            permissions: {
              select: {
                permission_code: true,
              },
            },
          },
        },
      },
    });
  // 2. Permission check: role_id and status changes require Manager/Owner or employee:manage permission
  const needsElevatedPermission =
    (props.body.role_id !== undefined && props.body.role_id !== null) ||
    (props.body.status !== undefined && props.body.status !== null);
  if (needsElevatedPermission) {
    const isOwnerOrManager =
      callerMember.role.is_builtin &&
      (callerMember.role.name === "Owner" ||
        callerMember.role.name === "Manager");
    const hasEmployeeManage = callerMember.role.permissions.some(
      (p: { permission_code: string }) =>
        p.permission_code === "employee:manage",
    );
    if (!isOwnerOrManager && !hasEmployeeManage) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // 3. Validate department_id if explicitly provided as non-null
  if (
    props.body.department_id !== undefined &&
    props.body.department_id !== null
  ) {
    await MyGlobal.prisma.erp_hrm_departments.findFirstOrThrow({
      where: {
        id: props.body.department_id,
        organization_id: props.organizationId,
        deleted_at: null,
      },
      select: { id: true },
    });
  }
  // 4. Build department relation update segment
  const departmentUpdate =
    props.body.department_id === undefined
      ? {}
      : props.body.department_id === null
        ? { department: { disconnect: true } }
        : { department: { connect: { id: props.body.department_id } } };
  // 5. Build role relation update segment
  const roleUpdate =
    props.body.role_id === undefined || props.body.role_id === null
      ? {}
      : { role: { connect: { id: props.body.role_id } } };
  // 6. Execute update
  await MyGlobal.prisma.erp_hrm_organization_members.update({
    where: { id: callerMember.id },
    data: {
      updated_at: new Date(),
      ...(props.body.position !== undefined && {
        position: props.body.position,
      }),
      ...(props.body.employment_type !== undefined && {
        employment_type: props.body.employment_type,
      }),
      ...(props.body.status !== undefined &&
        props.body.status !== null && {
          status: props.body.status,
        }),
      ...departmentUpdate,
      ...roleUpdate,
    },
  });
  // 7. Re-fetch with full transformer select for response DTO
  const updated =
    await MyGlobal.prisma.erp_hrm_organization_members.findUniqueOrThrow({
      where: { id: callerMember.id },
      ...ErpHrmOrganizationMemberTransformer.select(),
    });
  // 8. Transform and return
  return ErpHrmOrganizationMemberTransformer.transform(updated);
}
