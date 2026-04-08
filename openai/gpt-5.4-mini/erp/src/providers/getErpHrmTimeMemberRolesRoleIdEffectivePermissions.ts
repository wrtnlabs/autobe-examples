import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeRoleAtInvertTransformer } from "../transformers/ErpHrmTimeRoleAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeMemberRolesRoleIdEffectivePermissions(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeRole.IInvert> {
  const role = await MyGlobal.prisma.erp_hrm_time_roles.findFirstOrThrow({
    where: {
      id: props.roleId,
      deleted_at: null,
    },
    ...ErpHrmTimeRoleAtInvertTransformer.select(),
  });
  return await ErpHrmTimeRoleAtInvertTransformer.transform(role);
}
