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
  departmentId: string;
  body: IErpHrmDepartment.IUpdate;
}): Promise<IErpHrmDepartment> {
  // Get organization member to determine organization context
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        organization_id: true,
      },
    });
  // Find target department ensuring it belongs to the organization
  const department = await MyGlobal.prisma.erp_hrm_departments.findFirstOrThrow(
    {
      where: {
        id: props.departmentId,
        organization_id: orgMember.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        parent_department_id: true,
      },
    },
  );
  // Validate name uniqueness if updating name
  if (props.body.name !== undefined && props.body.name !== department.name) {
    const existingDept = await MyGlobal.prisma.erp_hrm_departments.findFirst({
      where: {
        organization_id: orgMember.organization_id,
        name: props.body.name,
        deleted_at: null,
        id: { not: props.departmentId },
      },
      select: { id: true },
    });
    if (existingDept !== null) {
      throw new HttpException(
        "Department name already exists in this organization",
        400,
      );
    }
  }
  // Validate parentDepartmentId if provided
  if (props.body.parentDepartmentId !== undefined) {
    if (props.body.parentDepartmentId === null) {
      // Clear parent - making it top-level, no validation needed
    } else {
      // Validate new parent exists and belongs to same organization
      const parentDept = await MyGlobal.prisma.erp_hrm_departments.findFirst({
        where: {
          id: props.body.parentDepartmentId,
          organization_id: orgMember.organization_id,
          deleted_at: null,
        },
        select: {
          id: true,
          parent_department_id: true,
        },
      });
      if (parentDept === null) {
        throw new HttpException("Parent department not found", 404);
      }
      // Validate single-level nesting: parent must not have its own parent
      if (parentDept.parent_department_id !== null) {
        throw new HttpException(
          "Parent department already has a parent - only single-level nesting is allowed",
          400,
        );
      }
      // Prevent circular reference: cannot set self as parent
      if (parentDept.id === props.departmentId) {
        throw new HttpException("Department cannot be its own parent", 400);
      }
    }
  }
  // Build update data
  const updateData: Prisma.erp_hrm_departmentsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.parentDepartmentId !== undefined) {
    if (props.body.parentDepartmentId === null) {
      updateData.parentDepartment = { disconnect: true };
    } else {
      updateData.parentDepartment = {
        connect: { id: props.body.parentDepartmentId },
      };
    }
  }
  // Update department
  await MyGlobal.prisma.erp_hrm_departments.update({
    where: { id: props.departmentId },
    data: updateData,
  });
  // Fetch updated department with all relationships
  const updated = await MyGlobal.prisma.erp_hrm_departments.findUniqueOrThrow({
    where: { id: props.departmentId },
    ...ErpHrmDepartmentTransformer.select(),
  });
  return await ErpHrmDepartmentTransformer.transform(updated);
}
