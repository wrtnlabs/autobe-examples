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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmRolePermissionAtSummaryTransformer } from "../transformers/ErpHrmRolePermissionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberPermissions(props: {
  member: MemberPayload;
}): Promise<IErpHrmRolePermission.ISummary[]> {
  const permissions = await MyGlobal.prisma.erp_hrm_role_permissions.findMany({
    orderBy: { permission: "asc" },
    ...ErpHrmRolePermissionAtSummaryTransformer.select(),
  });
  return await ArrayUtil.asyncMap(
    permissions,
    ErpHrmRolePermissionAtSummaryTransformer.transform,
  );
}
