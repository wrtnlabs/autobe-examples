import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLog";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingActivityLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";
import { HrmTimeTrackingActivityLogAtSummaryTransformer } from "../transformers/HrmTimeTrackingActivityLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingManagerActivityLogsSearch(props: {
  manager: ManagerPayload;
  body: IHrmTimeTrackingActivityLog.IRequest;
}): Promise<IPageIHrmTimeTrackingActivityLog.ISummary> {
  const membership =
    await MyGlobal.prisma.hrm_time_tracking_manager_sessions.findUniqueOrThrow({
      where: {
        id: props.manager.session_id,
      },
      select: {
        id: true,
        hrm_time_tracking_manager_id: true,
      },
    });
  if (membership.hrm_time_tracking_manager_id !== props.manager.id) {
    throw new HttpException("Forbidden", 403);
  }
  const manager =
    await MyGlobal.prisma.hrm_time_tracking_managers.findUniqueOrThrow({
      where: {
        id: membership.hrm_time_tracking_manager_id,
      },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  if (manager.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    props.body.startCreatedAt !== undefined &&
    props.body.endCreatedAt !== undefined &&
    props.body.endCreatedAt < props.body.startCreatedAt
  ) {
    throw new HttpException("Invalid date range", 400);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.actorType !== undefined && {
      actor_type: props.body.actorType,
    }),
    ...(props.body.actionType !== undefined && {
      action_type: props.body.actionType,
    }),
    ...(props.body.targetEntity !== undefined && {
      target_entity: props.body.targetEntity,
    }),
    ...(props.body.targetEntityId !== undefined && {
      target_entity_id: props.body.targetEntityId,
    }),
    ...(props.body.search !== undefined && {
      details: {
        contains: props.body.search,
        mode: "insensitive" satisfies Prisma.QueryMode,
      },
    }),
    ...((props.body.startCreatedAt !== undefined ||
      props.body.endCreatedAt !== undefined) && {
      created_at: {
        ...(props.body.startCreatedAt !== undefined && {
          gte: props.body.startCreatedAt,
        }),
        ...(props.body.endCreatedAt !== undefined && {
          lte: props.body.endCreatedAt,
        }),
      },
    }),
  } satisfies Prisma.hrm_time_tracking_activity_logsWhereInput;
  const sort = props.body.sort?.trim().toLowerCase() ?? "created_at desc";
  const orderByInput: Prisma.hrm_time_tracking_activity_logsOrderByWithRelationInput[] =
    sort === "created_at asc"
      ? [{ created_at: Prisma.SortOrder.asc }, { id: Prisma.SortOrder.asc }]
      : sort === "created_at desc"
        ? [{ created_at: Prisma.SortOrder.desc }, { id: Prisma.SortOrder.desc }]
        : sort === "action_type asc"
          ? [
              { action_type: Prisma.SortOrder.asc },
              { id: Prisma.SortOrder.asc },
            ]
          : sort === "action_type desc"
            ? [
                { action_type: Prisma.SortOrder.desc },
                { id: Prisma.SortOrder.desc },
              ]
            : sort === "target_entity asc"
              ? [
                  { target_entity: Prisma.SortOrder.asc },
                  { id: Prisma.SortOrder.asc },
                ]
              : sort === "target_entity desc"
                ? [
                    { target_entity: Prisma.SortOrder.desc },
                    { id: Prisma.SortOrder.desc },
                  ]
                : [
                    { created_at: Prisma.SortOrder.desc },
                    { id: Prisma.SortOrder.desc },
                  ];
  const data = await MyGlobal.prisma.hrm_time_tracking_activity_logs.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...HrmTimeTrackingActivityLogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_time_tracking_activity_logs.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmTimeTrackingActivityLogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
