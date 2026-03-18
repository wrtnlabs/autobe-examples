import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingOrganizationWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationWeeklySummary";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingOrganizationWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOrganizationWeeklySummary";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingOrganizationWeeklySummaryAtSummaryTransformer } from "../transformers/HrmTimeTrackingOrganizationWeeklySummaryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingOrganizationWeeklySummaries(props: {
  body: IHrmTimeTrackingOrganizationWeeklySummary.IRequest;
}): Promise<IPageIHrmTimeTrackingOrganizationWeeklySummary.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const project = props.body.projectId
    ? await MyGlobal.prisma.hrm_time_tracking_projects.findUniqueOrThrow({
        where: { id: props.body.projectId },
        select: {
          id: true,
          hrm_time_tracking_organization_id: true,
          deleted_at: true,
        },
      })
    : null;
  if (project !== null && project.deleted_at !== null) {
    throw new HttpException("Project not found", 404);
  }
  const where = {
    deleted_at: null,
    ...(project !== null
      ? {
          hrm_time_tracking_organization_id:
            project.hrm_time_tracking_organization_id,
        }
      : {}),
    ...(props.body.weekStartDate !== undefined
      ? {
          week_start_date: {
            gte: props.body.weekStartDate,
          },
        }
      : {}),
    ...(props.body.weekEndDate !== undefined
      ? {
          week_end_date: {
            lte: props.body.weekEndDate,
          },
        }
      : {}),
  } satisfies Prisma.hrm_time_tracking_organization_weekly_summariesWhereInput;
  const orderBy =
    props.body.sort === "week_start_date_asc"
      ? ({
          week_start_date: "asc",
        } satisfies Prisma.hrm_time_tracking_organization_weekly_summariesOrderByWithRelationInput)
      : ({
          week_start_date: "desc",
        } satisfies Prisma.hrm_time_tracking_organization_weekly_summariesOrderByWithRelationInput);
  const data =
    await MyGlobal.prisma.hrm_time_tracking_organization_weekly_summaries.findMany(
      {
        where,
        orderBy,
        skip,
        take: limit,
        ...HrmTimeTrackingOrganizationWeeklySummaryAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.hrm_time_tracking_organization_weekly_summaries.count(
      {
        where,
      },
    );
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmTimeTrackingOrganizationWeeklySummaryAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
