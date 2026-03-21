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
import { ErpHrmRoleAtSummaryTransformer } from "../transformers/ErpHrmRoleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberRolesSummary(props: {
  member: MemberPayload;
}): Promise<IErpHrmRole.ISummary[]> {
  // Retrieve the employee's organization context
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify organization exists
  await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow({
    where: { id: employee.erp_hrm_organization_id },
  });
  // Query roles filtered by organization, ordered by is_builtin DESC, name ASC
  const roles = await MyGlobal.prisma.erp_hrm_roles.findMany({
    where: {
      erp_hrm_organization_id: employee.erp_hrm_organization_id,
      deleted_at: null,
    },
    orderBy: [{ is_builtin: "desc" }, { name: "asc" }],
    ...ErpHrmRoleAtSummaryTransformer.select(),
  });
  // Transform each role to ISummary format
  return await ArrayUtil.asyncMap(
    roles,
    ErpHrmRoleAtSummaryTransformer.transform,
  );
}
