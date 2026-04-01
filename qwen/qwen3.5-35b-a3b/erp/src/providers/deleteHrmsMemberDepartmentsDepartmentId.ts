import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmsMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const member = await MyGlobal.prisma.hrms_members.findUniqueOrThrow({
    where: { id: props.member.id },
    include: {
      organizationMembers: {
        select: {
          organization: {
            select: { id: true, deleted_at: true },
          },
        },
      },
    },
  });
  const memberOrganization = member.organizationMembers.find(
    (om) => om.organization.deleted_at === null,
  );
  if (!memberOrganization) {
    throw new HttpException("Organization not found", 404);
  }
  const department = await MyGlobal.prisma.hrms_departments.findFirstOrThrow({
    where: {
      id: props.departmentId,
      organization_id: memberOrganization.organization.id,
    },
    include: {
      children: {
        where: { deleted_at: null },
        select: { id: true, name: true },
      },
      employees: {
        where: { deleted_at: null },
        select: { id: true, display_name: true },
      },
    },
  });
  if (department.children.length > 0) {
    throw new HttpException(
      `Cannot delete department with ${department.children.length} child department(s): ${department.children.map((c) => c.name).join(", ")}`,
      409,
    );
  }
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.hrms_employees.updateMany({
      where: {
        department_id: props.departmentId,
        deleted_at: null,
      },
      data: {
        department_id: null,
      },
    });
    await tx.hrms_departments.update({
      where: { id: props.departmentId },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
    await tx.hrms_activity_logs.create({
      data: {
        id: v4(),
        organization_id: memberOrganization.organization.id,
        performed_by_id: props.member.id,
        action_type: "department.deleted",
        target_entity: "department",
        target_id: props.departmentId,
        details: `Department "${department.name}" deleted`,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  });
}
