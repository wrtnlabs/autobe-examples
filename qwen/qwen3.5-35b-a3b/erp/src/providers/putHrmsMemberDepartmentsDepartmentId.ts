import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
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
import { HrmsDepartmentTransformer } from "../transformers/HrmsDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmsMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
  body: IHrmsDepartment.IUpdate;
}): Promise<IHrmsDepartment> {
  // Fetch the department with organization_id for authorization check
  const existing = await MyGlobal.prisma.hrms_departments.findUniqueOrThrow({
    where: { id: props.departmentId },
    select: {
      id: true,
      organization_id: true,
      name: true,
      parent_id: true,
      deleted_at: true,
    },
  });
  // Verify department is not soft-deleted
  if (existing.deleted_at !== null) {
    throw new HttpException("Department is already deleted", 400);
  }
  // Check authorization - member's organization must match department's organization
  const memberOrg = await MyGlobal.prisma.hrms_organization_members.findFirst({
    where: {
      member: { id: props.member.id },
      deleted_at: null,
    },
    select: { organization: { select: { id: true } } },
  });
  if (memberOrg === null) {
    throw new HttpException(
      "Access denied: member not enrolled in any organization",
      403,
    );
  }
  if (memberOrg.organization.id !== existing.organization_id) {
    throw new HttpException(
      "Access denied: department does not belong to your organization",
      403,
    );
  }
  // Validate parent department exists in same organization if parent_id is provided
  if (props.body.parent_id !== undefined && props.body.parent_id !== null) {
    const parent = await MyGlobal.prisma.hrms_departments.findUniqueOrThrow({
      where: { id: props.body.parent_id },
      select: {
        id: true,
        organization_id: true,
      },
    });
    if (parent.organization_id !== existing.organization_id) {
      throw new HttpException(
        "Parent department must belong to the same organization",
        400,
      );
    }
  }
  // Check name uniqueness if name is being updated
  if (props.body.name !== undefined) {
    const nameConflict = await MyGlobal.prisma.hrms_departments.findFirst({
      where: {
        organization_id: existing.organization_id,
        name: props.body.name,
        id: { not: existing.id },
      },
      select: { id: true },
    });
    if (nameConflict !== null) {
      throw new HttpException(
        "Department name must be unique within the organization",
        400,
      );
    }
  }
  // Apply update with updated_at timestamp
  const updateData: Prisma.hrms_departmentsUpdateInput = {
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.parent_id !== undefined && {
      parent:
        props.body.parent_id !== null
          ? { connect: { id: props.body.parent_id } }
          : { disconnect: true },
    }),
    updated_at: new Date(),
  };
  await MyGlobal.prisma.hrms_departments.update({
    where: { id: props.departmentId },
    data: updateData,
  });
  // Fetch the complete updated record with transformer select
  const updated = await MyGlobal.prisma.hrms_departments.findUniqueOrThrow({
    where: { id: props.departmentId },
    ...HrmsDepartmentTransformer.select(),
  });
  // Transform and return
  return await HrmsDepartmentTransformer.transform(updated);
}
