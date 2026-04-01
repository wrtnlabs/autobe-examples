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
  const { member, body } = props;
  const { hrms_member_id, hrms_organization_id, hrms_organization_role_id } =
    body;
  // Validate employee:manage permission on requesting member for target organization
  const requestingOrganizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_organization_id: hrms_organization_id,
        hrms_member_id: member.id,
        deleted_at: null,
      },
      include: {
        organizationRole: {
          include: {
            permissions: {
              select: {
                permission: true,
              },
            },
          },
        },
      },
    });
  if (requestingOrganizationMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  const hasEmployeeManagePermission = (
    requestingOrganizationMember as any
  ).organizationRole.permissions.some(
    (p: { permission: string }) => p.permission === "employee:manage",
  );
  if (!hasEmployeeManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate target member exists and is active
  await MyGlobal.prisma.hrms_members.findUniqueOrThrow({
    where: {
      id: hrms_member_id,
      deleted_at: null,
    },
  });
  // Validate target organization exists
  await MyGlobal.prisma.hrms_organizations.findUniqueOrThrow({
    where: { id: hrms_organization_id },
  });
  // Validate target role exists within the target organization
  await MyGlobal.prisma.hrms_organization_roles.findUniqueOrThrow({
    where: {
      id: hrms_organization_role_id,
      organization_id: hrms_organization_id,
    },
  });
  // Check for duplicate active membership
  const existingMembership =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: hrms_member_id,
        hrms_organization_id: hrms_organization_id,
        deleted_at: null,
      },
    });
  if (existingMembership !== null) {
    throw new HttpException("Membership already exists", 409);
  }
  const created = await MyGlobal.prisma.hrms_organization_members.create({
    data: await HrmsOrganizationMemberCollector.collect({ body }),
    ...HrmsOrganizationMemberTransformer.select(),
  });
  return await HrmsOrganizationMemberTransformer.transform(created);
}
