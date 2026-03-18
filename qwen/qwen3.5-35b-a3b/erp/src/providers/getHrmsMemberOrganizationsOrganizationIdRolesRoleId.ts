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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsOrganizationRoleTransformer } from "../transformers/HrmsOrganizationRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmsMemberOrganizationsOrganizationIdRolesRoleId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  roleId: string & tags.Format<"uuid">;
}): Promise<IHrmsOrganizationRole> {
  // Verify member belongs to the requested organization
  const memberOrg = await MyGlobal.prisma.hrms_organization_members.findFirst({
    where: {
      hrms_member_id: props.member.id,
      hrms_organization_id: props.organizationId,
    },
    select: { id: true },
  });
  if (memberOrg === null) {
    throw new HttpException("You do not belong to this organization", 403);
  }
  // Query the role with organization and permissions
  const role = await MyGlobal.prisma.hrms_organization_roles.findUniqueOrThrow({
    where: {
      id: props.roleId,
      organization_id: props.organizationId,
    },
    ...HrmsOrganizationRoleTransformer.select(),
  });
  // Transform and return
  return await HrmsOrganizationRoleTransformer.transform(role);
}
