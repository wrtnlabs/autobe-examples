import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmRoleAtSummaryTransformer } from "../transformers/ErpHrmRoleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmAdminRoles(props: {
  admin: AdminPayload;
  body: IErpHrmRole.IRequest;
}): Promise<IPageIErpHrmRole.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.search !== undefined && {
      name: { contains: props.body.search, mode: Prisma.QueryMode.insensitive },
    }),
    ...(props.body.is_builtin !== undefined && {
      is_builtin: props.body.is_builtin,
    }),
  } satisfies Prisma.erp_hrm_rolesWhereInput;
  const orderByInput = (
    props.body.order === "asc"
      ? { name: "asc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.erp_hrm_rolesOrderByWithRelationInput;
  const data = await MyGlobal.prisma.erp_hrm_roles.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ErpHrmRoleAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_roles.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmRoleAtSummaryTransformer.transform,
    ),
  };
}
