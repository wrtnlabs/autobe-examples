import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingProjectAtSummaryTransformer } from "../transformers/HrmTimeTrackingProjectAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingProjects(props: {
  body: IHrmTimeTrackingProject.IRequest;
}): Promise<IPageIHrmTimeTrackingProject.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where = {
    deleted_at: null,
    ...(props.body.status !== undefined
      ? {
          status: props.body.status,
        }
      : {}),
    ...(props.body.search !== undefined && props.body.search.length !== 0
      ? {
          OR: [
            {
              name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  } satisfies Prisma.hrm_time_tracking_projectsWhereInput;
  const orderBy: Prisma.hrm_time_tracking_projectsOrderByWithRelationInput[] =
    props.body.sort === "updated_at"
      ? [{ updated_at: "desc" }, { id: "desc" }]
      : props.body.sort === "name"
        ? [{ name: "asc" }, { id: "desc" }]
        : props.body.sort === "start_date"
          ? [{ start_date: "desc" }, { id: "desc" }]
          : props.body.sort === "end_date"
            ? [{ end_date: "desc" }, { id: "desc" }]
            : props.body.sort === "budget_hours"
              ? [{ budget_hours: "desc" }, { id: "desc" }]
              : props.body.sort === "created_at"
                ? [{ created_at: "desc" }, { id: "desc" }]
                : [{ created_at: "desc" }, { id: "desc" }];
  const rows = await MyGlobal.prisma.hrm_time_tracking_projects.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...HrmTimeTrackingProjectAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_time_tracking_projects.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      rows,
      HrmTimeTrackingProjectAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
