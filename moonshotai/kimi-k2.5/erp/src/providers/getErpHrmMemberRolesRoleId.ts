import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmRoleTransformer } from "../transformers/ErpHrmRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberRolesRoleId(props: {
  member: MemberPayload;
  roleId: string;
}): Promise<IErpHrmRole> {
  // Get the member's active organization membership for context
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        user_id: props.member.id,
        is_active: true,
        deleted_at: null,
      },
      select: {
        organization_id: true,
      },
    });
  // Retrieve the role that belongs to the member's current organization
  const role = await MyGlobal.prisma.erp_hrm_roles.findFirstOrThrow({
    where: {
      id: props.roleId,
      organization_id: orgMember.organization_id,
    },
    ...ErpHrmRoleTransformer.select(),
  });
  return await ErpHrmRoleTransformer.transform(role);
}
