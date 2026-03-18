import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmRoleCollector } from "../collectors/ErpHrmRoleCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmRoleTransformer } from "../transformers/ErpHrmRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberRoles(props: {
  member: MemberPayload;
  body: IErpHrmRole.ICreate;
}): Promise<IErpHrmRole> {
  // Get the organization member record to find current organization context
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        organization_id: true,
      },
    });
  if (orgMember === null) {
    throw new HttpException(
      "You are not associated with any organization",
      403,
    );
  }
  // Check for duplicate role name within this organization
  const existingRole = await MyGlobal.prisma.erp_hrm_roles.findFirst({
    where: {
      name: props.body.name,
      deleted_at: null,
      organization_id: orgMember.organization_id,
    },
  });
  if (existingRole !== null) {
    throw new HttpException(
      `Role with name '${props.body.name}' already exists in this organization`,
      409,
    );
  }
  // Create the role using collector
  const created = await MyGlobal.prisma.erp_hrm_roles.create({
    data: await ErpHrmRoleCollector.collect({
      body: props.body,
      erpHrmOrganizations: { id: orgMember.organization_id },
    }),
    ...ErpHrmRoleTransformer.select(),
  });
  return await ErpHrmRoleTransformer.transform(created);
}
