import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingProjectBudgetAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectBudgetAlert";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingProjectBudgetAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingProjectBudgetAlert";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingProjectBudgetAlerts(props: {
  body: IHrmTimeTrackingProjectBudgetAlert.IRequest;
}): Promise<IPageIHrmTimeTrackingProjectBudgetAlert.ISummary> {
  if (
    props.body.weekStartFrom !== undefined &&
    props.body.weekStartTo !== undefined &&
    props.body.weekStartFrom > props.body.weekStartTo
  ) {
    throw new HttpException("weekStartFrom must not exceed weekStartTo", 400);
  }
  if (
    props.body.weekEndFrom !== undefined &&
    props.body.weekEndTo !== undefined &&
    props.body.weekEndFrom > props.body.weekEndTo
  ) {
    throw new HttpException("weekEndFrom must not exceed weekEndTo", 400);
  }
  if (
    props.body.createdAtFrom !== undefined &&
    props.body.createdAtTo !== undefined &&
    props.body.createdAtFrom > props.body.createdAtTo
  ) {
    throw new HttpException("createdAtFrom must not exceed createdAtTo", 400);
  }
  if (
    props.body.updatedAtFrom !== undefined &&
    props.body.updatedAtTo !== undefined &&
    props.body.updatedAtFrom > props.body.updatedAtTo
  ) {
    throw new HttpException("updatedAtFrom must not exceed updatedAtTo", 400);
  }
  if (
    props.body.actualHoursMin !== undefined &&
    props.body.actualHoursMax !== undefined &&
    props.body.actualHoursMin > props.body.actualHoursMax
  ) {
    throw new HttpException(
      "actualHoursMin must not exceed actualHoursMax",
      400,
    );
  }
  if (
    props.body.utilizationRateMin !== undefined &&
    props.body.utilizationRateMax !== undefined &&
    props.body.utilizationRateMin > props.body.utilizationRateMax
  ) {
    throw new HttpException(
      "utilizationRateMin must not exceed utilizationRateMax",
      400,
    );
  }
  if (
    props.body.thresholdRateMin !== undefined &&
    props.body.thresholdRateMax !== undefined &&
    props.body.thresholdRateMin > props.body.thresholdRateMax
  ) {
    throw new HttpException(
      "thresholdRateMin must not exceed thresholdRateMax",
      400,
    );
  }
  if (
    props.body.sort !== undefined &&
    props.body.sort.length !== 0 &&
    props.body.sort !== "is_alert_asc" &&
    props.body.sort !== "is_alert_desc" &&
    props.body.sort !== "week_start_date_asc" &&
    props.body.sort !== "week_start_date_desc" &&
    props.body.sort !== "utilization_rate_asc" &&
    props.body.sort !== "utilization_rate_desc" &&
    props.body.sort !== "created_at_asc" &&
    props.body.sort !== "created_at_desc" &&
    props.body.sort !== "updated_at_asc" &&
    props.body.sort !== "updated_at_desc"
  ) {
    throw new HttpException("Unsupported sort value", 400);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.projectId !== undefined && {
      hrm_time_tracking_project_id: props.body.projectId,
    }),
    ...(props.body.isAlert !== undefined && {
      is_alert: props.body.isAlert,
    }),
    ...((props.body.weekStartFrom !== undefined ||
      props.body.weekStartTo !== undefined) && {
      week_start_date: {
        ...(props.body.weekStartFrom !== undefined && {
          gte: props.body.weekStartFrom,
        }),
        ...(props.body.weekStartTo !== undefined && {
          lte: props.body.weekStartTo,
        }),
      },
    }),
    ...((props.body.weekEndFrom !== undefined ||
      props.body.weekEndTo !== undefined) && {
      week_end_date: {
        ...(props.body.weekEndFrom !== undefined && {
          gte: props.body.weekEndFrom,
        }),
        ...(props.body.weekEndTo !== undefined && {
          lte: props.body.weekEndTo,
        }),
      },
    }),
    ...((props.body.actualHoursMin !== undefined ||
      props.body.actualHoursMax !== undefined) && {
      actual_hours: {
        ...(props.body.actualHoursMin !== undefined && {
          gte: props.body.actualHoursMin,
        }),
        ...(props.body.actualHoursMax !== undefined && {
          lte: props.body.actualHoursMax,
        }),
      },
    }),
    ...((props.body.utilizationRateMin !== undefined ||
      props.body.utilizationRateMax !== undefined) && {
      utilization_rate: {
        ...(props.body.utilizationRateMin !== undefined && {
          gte: props.body.utilizationRateMin,
        }),
        ...(props.body.utilizationRateMax !== undefined && {
          lte: props.body.utilizationRateMax,
        }),
      },
    }),
    ...((props.body.thresholdRateMin !== undefined ||
      props.body.thresholdRateMax !== undefined) && {
      threshold_rate: {
        ...(props.body.thresholdRateMin !== undefined && {
          gte: props.body.thresholdRateMin,
        }),
        ...(props.body.thresholdRateMax !== undefined && {
          lte: props.body.thresholdRateMax,
        }),
      },
    }),
    ...((props.body.createdAtFrom !== undefined ||
      props.body.createdAtTo !== undefined) && {
      created_at: {
        ...(props.body.createdAtFrom !== undefined && {
          gte: props.body.createdAtFrom,
        }),
        ...(props.body.createdAtTo !== undefined && {
          lte: props.body.createdAtTo,
        }),
      },
    }),
    ...((props.body.updatedAtFrom !== undefined ||
      props.body.updatedAtTo !== undefined) && {
      updated_at: {
        ...(props.body.updatedAtFrom !== undefined && {
          gte: props.body.updatedAtFrom,
        }),
        ...(props.body.updatedAtTo !== undefined && {
          lte: props.body.updatedAtTo,
        }),
      },
    }),
    project: {
      deleted_at: null,
      ...(props.body.projectStatus !== undefined && {
        status: props.body.projectStatus,
      }),
      ...(props.body.search !== undefined &&
        props.body.search.length !== 0 && {
          name: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }),
    },
  } satisfies Prisma.hrm_time_tracking_project_budget_alertsWhereInput;
  const orderByInput = (
    props.body.sort === "is_alert_asc"
      ? [{ is_alert: "asc" }, { id: "asc" }]
      : props.body.sort === "is_alert_desc"
        ? [{ is_alert: "desc" }, { id: "asc" }]
        : props.body.sort === "week_start_date_asc"
          ? [{ week_start_date: "asc" }, { id: "asc" }]
          : props.body.sort === "week_start_date_desc"
            ? [{ week_start_date: "desc" }, { id: "asc" }]
            : props.body.sort === "utilization_rate_asc"
              ? [{ utilization_rate: "asc" }, { id: "asc" }]
              : props.body.sort === "utilization_rate_desc"
                ? [{ utilization_rate: "desc" }, { id: "asc" }]
                : props.body.sort === "created_at_asc"
                  ? [{ created_at: "asc" }, { id: "asc" }]
                  : props.body.sort === "created_at_desc"
                    ? [{ created_at: "desc" }, { id: "asc" }]
                    : props.body.sort === "updated_at_asc"
                      ? [{ updated_at: "asc" }, { id: "asc" }]
                      : props.body.sort === "updated_at_desc"
                        ? [{ updated_at: "desc" }, { id: "asc" }]
                        : [
                            { is_alert: "desc" },
                            { week_start_date: "desc" },
                            { utilization_rate: "desc" },
                            { id: "asc" },
                          ]
  ) satisfies Prisma.hrm_time_tracking_project_budget_alertsOrderByWithRelationInput[];
  const data =
    await MyGlobal.prisma.hrm_time_tracking_project_budget_alerts.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      select: {
        id: true,
        project: {
          select: {
            id: true,
            organization: {
              select: {
                id: true,
                name: true,
                description: true,
                logo_uri: true,
                currency_code: true,
                timezone: true,
                fiscal_start_month: true,
                created_at: true,
                updated_at: true,
              },
            },
            name: true,
            description: true,
            color_code: true,
            status: true,
            budget_hours: true,
            start_date: true,
            end_date: true,
            created_at: true,
            updated_at: true,
          },
        },
        week_start_date: true,
        week_end_date: true,
        actual_hours: true,
        utilization_rate: true,
        threshold_rate: true,
        is_alert: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      } satisfies Prisma.hrm_time_tracking_project_budget_alertsSelect,
    });
  const total =
    await MyGlobal.prisma.hrm_time_tracking_project_budget_alerts.count({
      where: whereInput,
    });
  return {
    data: data.map((item) => ({
      id: item.id,
      project: {
        id: item.project.id,
        organization: {
          id: item.project.organization.id,
          name: item.project.organization.name,
          description: item.project.organization.description ?? null,
          logo_uri: item.project.organization.logo_uri ?? null,
          currency_code: item.project.organization.currency_code,
          timezone: item.project.organization.timezone,
          fiscal_start_month: item.project.organization.fiscal_start_month,
          created_at: item.project.organization.created_at.toISOString(),
          updated_at: item.project.organization.updated_at.toISOString(),
        } satisfies IHrmTimeTrackingOrganization.ISummary,
        name: item.project.name,
        description: item.project.description ?? null,
        color_code: item.project.color_code,
        status: item.project.status,
        budget_hours: item.project.budget_hours ?? null,
        start_date: item.project.start_date?.toISOString() ?? null,
        end_date: item.project.end_date?.toISOString() ?? null,
        created_at: item.project.created_at.toISOString(),
        updated_at: item.project.updated_at.toISOString(),
      } satisfies IHrmTimeTrackingProject.ISummary,
      week_start_date: item.week_start_date.toISOString(),
      week_end_date: item.week_end_date.toISOString(),
      actual_hours: item.actual_hours,
      utilization_rate: item.utilization_rate,
      threshold_rate: item.threshold_rate,
      is_alert: item.is_alert,
      created_at: item.created_at.toISOString(),
      updated_at: item.updated_at.toISOString(),
      deleted_at: item.deleted_at?.toISOString() ?? null,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
