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
  const membership = await MyGlobal.prisma.hrms_organization_members.findFirst({
    where: {
      organization: { id: props.organizationId },
      member: { id: props.member.id },
      deleted_at: null,
    },
  });
  if (membership === null) {
    throw new HttpException("Forbidden", 403);
  }
  const result =
    await MyGlobal.prisma.hrms_organization_roles.findUniqueOrThrow({
      where: {
        id: props.roleId,
        organization: { id: props.organizationId },
      },
      ...HrmsOrganizationRoleTransformer.select(),
    });
  return HrmsOrganizationRoleTransformer.transform(result);
}
