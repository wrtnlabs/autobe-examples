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
import { HrmsDepartmentAtSummaryTransformer } from "../transformers/HrmsDepartmentAtSummaryTransformer";
import { HrmsOrganizationAtSummaryTransformer } from "../transformers/HrmsOrganizationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmsMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
}): Promise<IHrmsDepartment> {
  // Validate session is valid and not expired
  await MyGlobal.prisma.hrms_member_sessions.findFirstOrThrow({
    where: {
      hrms_member_id: props.member.id,
      id: props.member.session_id,
      expired_at: { gt: new Date() },
    },
  });
  // Get member's organization membership
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirstOrThrow({
      where: {
        hrms_member_id: props.member.id,
      },
    });
  const department = await MyGlobal.prisma.hrms_departments.findUniqueOrThrow({
    where: { id: props.departmentId, deleted_at: null },
    select: {
      id: true,
      name: true,
      description: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      organization_id: true,
      organization: HrmsOrganizationAtSummaryTransformer.select(),
      parent: HrmsDepartmentAtSummaryTransformer.select(),
      children: HrmsDepartmentAtSummaryTransformer.select(),
    },
  });
  if (department.organization_id !== organizationMember.hrms_organization_id) {
    throw new HttpException("Not Found", 404);
  }
  return {
    id: department.id,
    organization: await HrmsOrganizationAtSummaryTransformer.transform(
      department.organization,
    ),
    parent: department.parent
      ? await HrmsDepartmentAtSummaryTransformer.transform(department.parent)
      : null,
    name: department.name,
    description: department.description ?? undefined,
    created_at: department.created_at.toISOString(),
    updated_at: department.updated_at.toISOString(),
    deleted_at: department.deleted_at?.toISOString() ?? null,
    children: await ArrayUtil.asyncMap(
      department.children,
      HrmsDepartmentAtSummaryTransformer.transform,
    ),
  };
}
