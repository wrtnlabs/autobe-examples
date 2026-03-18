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
  const memberOrganization =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
      },
      select: { organization: { select: { id: true } } },
    });
  if (!memberOrganization) {
    throw new HttpException("Member not enrolled in any organization", 403);
  }
  const memberOrganizationId: string & tags.Format<"uuid"> =
    memberOrganization.organization.id;
  const department = await MyGlobal.prisma.hrms_departments.findUniqueOrThrow({
    where: { id: props.departmentId },
    select: {
      id: true,
      organization_id: true,
      name: true,
      deleted_at: true,
      children: { select: { id: true } },
    },
  });
  if (department.deleted_at !== null) {
    throw new HttpException("Department already deleted", 404);
  }
  if (department.organization_id !== memberOrganizationId) {
    throw new HttpException(
      "Department does not belong to your organization",
      404,
    );
  }
  if (department.children.length > 0) {
    const childIds = department.children.map((c) => c.id);
    throw new HttpException(
      `Cannot delete department with ${childIds.length} child department(s): ${childIds.join(", ")}`,
      409,
    );
  }
  const now: string & tags.Format<"date-time"> = new Date().toISOString();
  const activityId: string & tags.Format<"uuid"> = v4();
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.hrms_departments.update({
      where: { id: props.departmentId },
      data: { deleted_at: new Date() },
    }),
    MyGlobal.prisma.hrms_employees.updateMany({
      where: { department_id: props.departmentId, deleted_at: null },
      data: { department_id: null },
    }),
    MyGlobal.prisma.hrms_activity_logs.create({
      data: {
        id: activityId,
        organization_id: department.organization_id,
        performed_by_id: props.member.id,
        action_type: "department.deleted",
        target_entity: "department",
        target_id: props.departmentId,
        details: `Department '${department.name}' deleted`,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    }),
  ]);
}
