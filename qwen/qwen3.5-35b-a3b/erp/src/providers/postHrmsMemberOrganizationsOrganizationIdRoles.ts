import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmsOrganizationRoleCollector } from "../collectors/HrmsOrganizationRoleCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsOrganizationRoleTransformer } from "../transformers/HrmsOrganizationRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmsMemberOrganizationsOrganizationIdRoles(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmsOrganizationRole.ICreate;
}): Promise<IHrmsOrganizationRole> {
  // 1. Validate caller is organization owner
  const memberRole = await MyGlobal.prisma.hrms_organization_members.findFirst({
    where: {
      hrms_member_id: props.member.id,
      hrms_organization_id: props.organizationId,
      organizationRole: {
        name: "Owner",
        is_builtin: true,
      },
    },
    include: {
      organizationRole: true,
    },
  });
  if (
    !memberRole ||
    memberRole.organizationRole.name !== "Owner" ||
    !memberRole.organizationRole.is_builtin
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Check role name uniqueness within organization
  const existingRole = await MyGlobal.prisma.hrms_organization_roles.findFirst({
    where: {
      organization_id: props.organizationId,
      name: props.body.name,
    },
  });
  if (existingRole) {
    throw new HttpException("Role name already exists", 409);
  }
  // 3. Create role with permissions in transaction
  const createdRole = await MyGlobal.prisma.$transaction(async (tx) => {
    const collectorResult = await HrmsOrganizationRoleCollector.collect({
      body: props.body,
      hrmsOrganizations: { id: props.organizationId } as IEntity,
    });
    const role = await tx.hrms_organization_roles.create({
      data: collectorResult,
    });
    return role;
  });
  // 4. Fetch the created role with all relations using transformer select
  const fullRole =
    await MyGlobal.prisma.hrms_organization_roles.findUniqueOrThrow({
      where: { id: createdRole.id },
      ...HrmsOrganizationRoleTransformer.select(),
    });
  // 5. Transform and return
  return await HrmsOrganizationRoleTransformer.transform(fullRole);
}
