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
import { ErpHrmDepartmentCollector } from "../collectors/ErpHrmDepartmentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmDepartmentTransformer } from "../transformers/ErpHrmDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberDepartments(props: {
  member: MemberPayload;
  body: IErpHrmDepartment.ICreate;
}): Promise<IErpHrmDepartment> {
  // Get member's current organization from session
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: {
        erp_hrm_organization_id: true,
      },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization selected", 400);
  }
  // Get employee with role permissions
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: session.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: {
      role: {
        select: {
          permissions: {
            select: { permission: true },
          },
        },
      },
    },
  });
  // Check org:manage permission
  const hasPermission = employee.role.permissions.some(
    (p) => p.permission === "org:manage",
  );
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Check department name uniqueness
  const existing = await MyGlobal.prisma.erp_hrm_departments.findFirst({
    where: {
      organization_id: session.erp_hrm_organization_id,
      name: props.body.name,
      deleted_at: null,
    },
  });
  if (existing !== null) {
    throw new HttpException("Department name already exists", 409);
  }
  // Validate parent_id if provided
  if (props.body.parent_id !== undefined && props.body.parent_id !== null) {
    const parent = await MyGlobal.prisma.erp_hrm_departments.findUnique({
      where: { id: props.body.parent_id },
      select: {
        organization_id: true,
        parent_id: true,
        deleted_at: true,
      },
    });
    if (parent === null) {
      throw new HttpException("Parent department not found", 400);
    }
    if (parent.organization_id !== session.erp_hrm_organization_id) {
      throw new HttpException(
        "Parent department not in same organization",
        400,
      );
    }
    if (parent.deleted_at !== null) {
      throw new HttpException("Parent department is deleted", 400);
    }
    if (parent.parent_id !== null) {
      throw new HttpException(
        "Cannot nest department under another sub-department",
        400,
      );
    }
  }
  // Create department using collector and transformer
  const created = await MyGlobal.prisma.erp_hrm_departments.create({
    data: await ErpHrmDepartmentCollector.collect({
      body: props.body,
      erpHrmOrganizations: { id: session.erp_hrm_organization_id },
    }),
    ...ErpHrmDepartmentTransformer.select(),
  });
  return await ErpHrmDepartmentTransformer.transform(created);
}
