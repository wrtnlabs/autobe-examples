import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeProjectAtSummaryTransformer } from "../transformers/ErpHrmTimeProjectAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberProjects(props: {
  member: MemberPayload;
  body: IErpHrmTimeProject.IRequest;
}): Promise<IPageIErpHrmTimeProject.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.erp_hrm_time_projectsWhereInput = {
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.search !== undefined && props.body.search !== ""
      ? {
          OR: [
            { name: { contains: props.body.search, mode: "insensitive" } },
            {
              description: { contains: props.body.search, mode: "insensitive" },
            },
          ],
        }
      : {}),
  };
  const data = await MyGlobal.prisma.erp_hrm_time_projects.findMany({
    where,
    skip,
    take: limit,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    ...ErpHrmTimeProjectAtSummaryTransformer.select(),
  });
  const records = await MyGlobal.prisma.erp_hrm_time_projects.count({ where });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmTimeProjectAtSummaryTransformer.transform,
    ),
  };
}
