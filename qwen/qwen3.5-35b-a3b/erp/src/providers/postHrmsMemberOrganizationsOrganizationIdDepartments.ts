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

export async function postHrmsMemberOrganizationsOrganizationIdDepartments(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmsDepartment.ICreate;
}): Promise<IHrmsDepartment> {
  const { member, organizationId, body } = props;
  const organizationMembership =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: member.id,
        hrms_organization_id: organizationId,
      },
      select: {
        hrms_organization_role_id: true,
      },
    });
  if (organizationMembership === null) {
    throw new HttpException("Organization membership not found", 404);
  }
  const role = await MyGlobal.prisma.hrms_organization_roles.findUnique({
    where: { id: organizationMembership.hrms_organization_role_id },
    select: { name: true },
  });
  if (role === null) {
    throw new HttpException("Role not found", 500);
  }
  if (role.name !== "Owner" && role.name !== "Manager") {
    throw new HttpException("Forbidden", 403);
  }
  const existingDepartment = await MyGlobal.prisma.hrms_departments.findFirst({
    where: {
      organization_id: organizationId,
      name: body.name,
      deleted_at: null,
    },
  });
  if (existingDepartment !== null) {
    throw new HttpException("Department name already exists", 409);
  }
  let parentId: (string & tags.Format<"uuid">) | null | undefined = undefined;
  if (body.parentDepartmentId !== null) {
    const parentDepartment = await MyGlobal.prisma.hrms_departments.findFirst({
      where: {
        id: body.parentDepartmentId,
        organization_id: organizationId,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (parentDepartment === null) {
      throw new HttpException("Parent department not found", 404);
    }
    parentId = parentDepartment.id;
  }
  const createdDepartment = await MyGlobal.prisma.$transaction(async (tx) => {
    const id: string & tags.Format<"uuid"> = v4();
    const department = await tx.hrms_departments.create({
      data: {
        id,
        name: body.name,
        description: body.description ?? null,
        organization: { connect: { id: organizationId } },
        parent:
          parentId !== undefined ? { connect: { id: parentId } } : undefined,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        parent_id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    await tx.hrms_activity_logs.create({
      data: {
        id: v4(),
        organization_id: organizationId,
        performed_by_id: member.id,
        action_type: "department.created",
        target_entity: "department",
        target_id: department.id,
        details: JSON.stringify({
          department_id: department.id,
          department_name: department.name,
        }),
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    return department;
  });
  const fullDepartment =
    await MyGlobal.prisma.hrms_departments.findUniqueOrThrow({
      where: { id: createdDepartment.id },
      ...HrmsDepartmentTransformer.select(),
    });
  return await HrmsDepartmentTransformer.transform(fullDepartment);
}
