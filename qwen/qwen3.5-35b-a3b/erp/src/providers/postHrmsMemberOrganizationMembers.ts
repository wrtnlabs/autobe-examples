import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmsOrganizationMemberCollector } from "../collectors/HrmsOrganizationMemberCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsOrganizationMemberTransformer } from "../transformers/HrmsOrganizationMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmsMemberOrganizationMembers(props: {
  member: MemberPayload;
  body: IHrmsOrganizationMember.ICreate;
}): Promise<IHrmsOrganizationMember> {
  // 1. Validate employee:manage permission on requesting member for target organization
  const targetMemberMembership =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_organization_id: props.body.hrms_organization_id,
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        organizationRole: {
          select: {
            id: true,
            permissions: {
              select: { permission: true },
            },
          },
        },
      },
    });
  if (targetMemberMembership === null) {
    throw new HttpException("You're not enrolled", 403);
  }
  const hasEmployeeManage =
    targetMemberMembership.organizationRole.permissions.some(
      (p) => p.permission === "employee:manage",
    );
  if (!hasEmployeeManage) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Validate target member exists and is active
  const targetMember = await MyGlobal.prisma.hrms_members.findFirst({
    where: { id: props.body.hrms_member_id },
  });
  if (targetMember === null) {
    throw new HttpException("Member not found", 404);
  }
  if (targetMember.deleted_at !== null) {
    throw new HttpException("Member account is deactivated", 400);
  }
  // 3. Validate target organization exists
  const targetOrganization = await MyGlobal.prisma.hrms_organizations.findFirst(
    {
      where: { id: props.body.hrms_organization_id },
    },
  );
  if (targetOrganization === null) {
    throw new HttpException("Organization not found", 404);
  }
  // 4. Validate target role exists and belongs to target organization
  const targetRole = await MyGlobal.prisma.hrms_organization_roles.findFirst({
    where: {
      id: props.body.hrms_organization_role_id,
      organization_id: props.body.hrms_organization_id,
    },
  });
  if (targetRole === null) {
    throw new HttpException("Role not found", 404);
  }
  // 5. Check for duplicate membership
  const existingMembership =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.body.hrms_member_id,
        hrms_organization_id: props.body.hrms_organization_id,
        deleted_at: null,
      },
    });
  if (existingMembership !== null) {
    throw new HttpException(
      "Member already has an active membership in this organization",
      409,
    );
  }
  // 6. Create membership
  const created = await MyGlobal.prisma.hrms_organization_members.create({
    data: await HrmsOrganizationMemberCollector.collect({ body: props.body }),
    ...HrmsOrganizationMemberTransformer.select(),
  });
  // 7. Return transformed result
  return await HrmsOrganizationMemberTransformer.transform(created);
}
