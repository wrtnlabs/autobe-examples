import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeRoleAtSummaryTransformer } from "../transformers/ErpHrmTimeRoleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeMemberRolesBuiltIn(props: {
  member: MemberPayload;
}): Promise<IErpHrmTimeRole.ISummary> {
  const organizationId = (
    props.member as {
      erp_hrm_time_organization_id?: string | null;
    }
  ).erp_hrm_time_organization_id;
  if (organizationId === undefined || organizationId === null) {
    throw new HttpException("Current organization context is required", 403);
  }
  const roles = await MyGlobal.prisma.erp_hrm_time_roles.findMany({
    where: {
      erp_hrm_time_organization_id: organizationId,
      is_builtin: true,
    },
    orderBy: { name: "asc" },
    ...ErpHrmTimeRoleAtSummaryTransformer.select(),
  });
  if (roles.length === 0) {
    throw new HttpException(
      "No built-in roles found in the current organization",
      404,
    );
  }
  return await ErpHrmTimeRoleAtSummaryTransformer.transform(roles[0]);
}
