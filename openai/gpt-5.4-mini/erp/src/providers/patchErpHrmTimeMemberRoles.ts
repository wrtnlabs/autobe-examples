import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeRole";
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

export async function patchErpHrmTimeMemberRoles(props: {
  member: MemberPayload;
  body: IErpHrmTimeRole.IRequest;
}): Promise<IPageIErpHrmTimeRole.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const organizationId: string | undefined = (
    props.member as unknown as {
      organization_id?: string;
    }
  ).organization_id;
  if (organizationId === undefined) {
    throw new HttpException("Organization context is missing", 401);
  }
  const where: Prisma.erp_hrm_time_rolesWhereInput = {
    erp_hrm_time_organization_id: organizationId,
    deleted_at: null,
    ...(props.body.search !== undefined
      ? {
          name: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.isBuiltin !== undefined
      ? { is_builtin: props.body.isBuiltin }
      : {}),
  };
  const orderBy: Prisma.erp_hrm_time_rolesOrderByWithRelationInput =
    props.body.sort === "createdAt"
      ? { created_at: props.body.order === "asc" ? "asc" : "desc" }
      : props.body.sort === "updatedAt"
        ? { updated_at: props.body.order === "asc" ? "asc" : "desc" }
        : props.body.sort === "isBuiltin"
          ? { is_builtin: props.body.order === "asc" ? "asc" : "desc" }
          : props.body.sort === "description"
            ? { description: props.body.order === "asc" ? "asc" : "desc" }
            : { name: props.body.order === "asc" ? "asc" : "desc" };
  const data = await MyGlobal.prisma.erp_hrm_time_roles.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...ErpHrmTimeRoleAtSummaryTransformer.select(),
  });
  const records: number = await MyGlobal.prisma.erp_hrm_time_roles.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTimeRoleAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
  };
}
