import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingTaskAtSummaryTransformer } from "../transformers/HrmTimeTrackingTaskAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingProjectsProjectIdTasks(props: {
  projectId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTask.IRequest;
}): Promise<IPageIHrmTimeTrackingTask.ISummary> {
  await MyGlobal.prisma.hrm_time_tracking_projects.findFirstOrThrow({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    hrm_time_tracking_project_id: props.projectId,
    deleted_at: null,
    ...(props.body.status !== undefined
      ? {
          status: props.body.status,
        }
      : {}),
    ...(props.body.priority !== undefined
      ? {
          priority: props.body.priority,
        }
      : {}),
    ...(props.body.hrm_time_tracking_employee_id !== undefined
      ? {
          hrm_time_tracking_employee_id:
            props.body.hrm_time_tracking_employee_id,
        }
      : {}),
    OR: [
      {
        parent_id: null,
      },
      {
        parent: {
          is: {
            hrm_time_tracking_project_id: props.projectId,
          },
        },
      },
    ],
  } satisfies Prisma.hrm_time_tracking_tasksWhereInput;
  const orderBy = (
    props.body.sort === "due_date"
      ? [
          {
            due_date: "asc",
          },
          {
            id: "asc",
          },
        ]
      : props.body.sort === "-due_date"
        ? [
            {
              due_date: "desc",
            },
            {
              id: "desc",
            },
          ]
        : props.body.sort === "priority"
          ? [
              {
                priority: "asc",
              },
              {
                id: "asc",
              },
            ]
          : props.body.sort === "-priority"
            ? [
                {
                  priority: "desc",
                },
                {
                  id: "desc",
                },
              ]
            : props.body.sort === "created_at"
              ? [
                  {
                    created_at: "asc",
                  },
                  {
                    id: "asc",
                  },
                ]
              : props.body.sort === "-created_at"
                ? [
                    {
                      created_at: "desc",
                    },
                    {
                      id: "desc",
                    },
                  ]
                : [
                    {
                      created_at: "desc",
                    },
                    {
                      id: "desc",
                    },
                  ]
  ) satisfies Prisma.hrm_time_tracking_tasksOrderByWithRelationInput[];
  const data = await MyGlobal.prisma.hrm_time_tracking_tasks.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...HrmTimeTrackingTaskAtSummaryTransformer.select(),
  });
  const records = await MyGlobal.prisma.hrm_time_tracking_tasks.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      HrmTimeTrackingTaskAtSummaryTransformer.transform,
    ),
  };
}
