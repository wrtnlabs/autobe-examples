import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmDepartmentTransformer } from "../transformers/ErpHrmDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
  body: IErpHrmDepartment.IUpdate;
}): Promise<IErpHrmDepartment> {
  // Get member's current session to find organization context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: {
        erp_hrm_organization_id: true,
      },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization context selected", 400);
  }
  const organizationId = session.erp_hrm_organization_id;
  // Find employee record and verify org:manage permission
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee record not found in organization", 403);
  }
  // Check org:manage permission
  const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
    where: {
      erp_hrm_role_id: employee.erp_hrm_role_id,
      permission: "org:manage",
    },
  });
  if (permission === null) {
    throw new HttpException("Forbidden - org:manage permission required", 403);
  }
  // Find department within current organization (tenant isolation)
  const existingDepartment =
    await MyGlobal.prisma.erp_hrm_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      select: {
        id: true,
        organization_id: true,
      },
    });
  if (existingDepartment.organization_id !== organizationId) {
    throw new HttpException("Department not found", 404);
  }
  // Check name uniqueness if name is being updated
  if (props.body.name !== undefined) {
    const nameConflict = await MyGlobal.prisma.erp_hrm_departments.findFirst({
      where: {
        organization_id: organizationId,
        name: props.body.name,
        id: { not: props.departmentId },
        deleted_at: null,
      },
    });
    if (nameConflict !== null) {
      throw new HttpException(
        "Department name already exists in organization",
        409,
      );
    }
  }
  // Update department
  const updated = await MyGlobal.prisma.erp_hrm_departments.update({
    where: { id: props.departmentId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      updated_at: new Date(),
    },
    ...ErpHrmDepartmentTransformer.select(),
  });
  // Return transformed result
  return await ErpHrmDepartmentTransformer.transform(updated);
}
