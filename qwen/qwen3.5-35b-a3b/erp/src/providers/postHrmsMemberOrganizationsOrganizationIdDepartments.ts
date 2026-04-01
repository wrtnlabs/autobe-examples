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
import { HrmsDepartmentCollector } from "../collectors/HrmsDepartmentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsDepartmentAtSummaryTransformer } from "../transformers/HrmsDepartmentAtSummaryTransformer";
import { HrmsDepartmentTransformer } from "../transformers/HrmsDepartmentTransformer";
import { HrmsOrganizationAtSummaryTransformer } from "../transformers/HrmsOrganizationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmsMemberOrganizationsOrganizationIdDepartments(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmsDepartment.ICreate;
}): Promise<IHrmsDepartment> {
  const { member, organizationId, body } = props;
  const activeOrganizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: member.id,
        organization: {
          id: organizationId,
        },
        deleted_at: null,
      },
      include: {
        organizationRole: true,
        member: true,
        organization: true,
      },
    });
  if (activeOrganizationMember === null) {
    throw new HttpException("Organization membership not found", 404);
  }
  if (
    activeOrganizationMember.organizationRole.name !== "Owner" &&
    activeOrganizationMember.organizationRole.name !== "Manager"
  ) {
    throw new HttpException("Organization management permission required", 403);
  }
  const existingDepartment = await MyGlobal.prisma.hrms_departments.findFirst({
    where: {
      organization_id: organizationId,
      name: body.name,
      deleted_at: null,
    },
  });
  if (existingDepartment !== null) {
    throw new HttpException(
      "Department name already exists in this organization",
      409,
    );
  }
  if (
    body.parentDepartmentId !== null &&
    body.parentDepartmentId !== undefined
  ) {
    const parentDepartment = await MyGlobal.prisma.hrms_departments.findFirst({
      where: {
        id: body.parentDepartmentId,
        organization_id: organizationId,
        deleted_at: null,
      },
    });
    if (parentDepartment === null) {
      throw new HttpException("Parent department not found", 404);
    }
  }
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const collection = await HrmsDepartmentCollector.collect({
      body,
      hrmsOrganizations: {
        id: organizationId,
      },
    });
    const department = await tx.hrms_departments.create({
      data: collection,
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: HrmsOrganizationAtSummaryTransformer.select(),
        parent: HrmsDepartmentAtSummaryTransformer.select(),
        children: HrmsDepartmentAtSummaryTransformer.select(),
        employees: HrmsDepartmentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrms_departmentsCreateArgs);
    await tx.hrms_activity_logs.create({
      data: {
        id: v4(),
        organization: { connect: { id: organizationId } },
        performedBy: { connect: { id: member.id } },
        action_type: "department.created",
        target_entity: "department",
        target_id: department.id,
        details: JSON.stringify({
          department_id: department.id,
          department_name: body.name,
        }),
        created_at: new Date(),
        updated_at: new Date(),
      } satisfies Prisma.hrms_activity_logsCreateInput,
    });
    return department;
  });
  return await HrmsDepartmentTransformer.transform(created);
}
