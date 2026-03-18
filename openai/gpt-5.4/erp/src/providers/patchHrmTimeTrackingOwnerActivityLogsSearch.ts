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
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { HrmTimeTrackingActivityLogAtSummaryTransformer } from "../transformers/HrmTimeTrackingActivityLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingOwnerActivityLogsSearch(props: {
  owner: OwnerPayload;
  body: IHrmTimeTrackingActivityLog.IRequest;
}): Promise<IPageIHrmTimeTrackingActivityLog.ISummary> {
  if (
    props.body.startCreatedAt !== undefined &&
    props.body.endCreatedAt !== undefined &&
    props.body.endCreatedAt < props.body.startCreatedAt
  ) {
    throw new HttpException("Invalid created_at range", 400);
  }
  const ownerSession =
    await MyGlobal.prisma.hrm_time_tracking_owner_sessions.findFirst({
      where: {
        id: props.owner.session_id,
        hrm_time_tracking_owner_id: props.owner.id,
      },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
      },
    });
  if (
    ownerSession === null ||
    ownerSession.hrm_time_tracking_organization_id === null
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    hrm_time_tracking_organization_id:
      ownerSession.hrm_time_tracking_organization_id,
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
        mode: "insensitive",
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
  const orderByInput =
    props.body.sort === "created_at"
      ? ([
          { created_at: "asc" },
          { id: "asc" },
        ] satisfies Prisma.hrm_time_tracking_activity_logsOrderByWithRelationInput[])
      : props.body.sort === "created_at:asc"
        ? ([
            { created_at: "asc" },
            { id: "asc" },
          ] satisfies Prisma.hrm_time_tracking_activity_logsOrderByWithRelationInput[])
        : props.body.sort === "created_at:desc"
          ? ([
              { created_at: "desc" },
              { id: "desc" },
            ] satisfies Prisma.hrm_time_tracking_activity_logsOrderByWithRelationInput[])
          : props.body.sort === "action_type"
            ? ([
                { action_type: "asc" },
                { id: "asc" },
              ] satisfies Prisma.hrm_time_tracking_activity_logsOrderByWithRelationInput[])
            : props.body.sort === "action_type:asc" ||
                props.body.sort === "actionType:asc"
              ? ([
                  { action_type: "asc" },
                  { id: "asc" },
                ] satisfies Prisma.hrm_time_tracking_activity_logsOrderByWithRelationInput[])
              : props.body.sort === "action_type:desc" ||
                  props.body.sort === "actionType:desc"
                ? ([
                    { action_type: "desc" },
                    { id: "desc" },
                  ] satisfies Prisma.hrm_time_tracking_activity_logsOrderByWithRelationInput[])
                : props.body.sort === "target_entity"
                  ? ([
                      { target_entity: "asc" },
                      { id: "asc" },
                    ] satisfies Prisma.hrm_time_tracking_activity_logsOrderByWithRelationInput[])
                  : props.body.sort === "target_entity:asc" ||
                      props.body.sort === "targetEntity:asc"
                    ? ([
                        { target_entity: "asc" },
                        { id: "asc" },
                      ] satisfies Prisma.hrm_time_tracking_activity_logsOrderByWithRelationInput[])
                    : props.body.sort === "target_entity:desc" ||
                        props.body.sort === "targetEntity:desc"
                      ? ([
                          { target_entity: "desc" },
                          { id: "desc" },
                        ] satisfies Prisma.hrm_time_tracking_activity_logsOrderByWithRelationInput[])
                      : ([
                          { created_at: "desc" },
                          { id: "desc" },
                        ] satisfies Prisma.hrm_time_tracking_activity_logsOrderByWithRelationInput[]);
  const records =
    await MyGlobal.prisma.hrm_time_tracking_activity_logs.findMany({
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
      records,
      HrmTimeTrackingActivityLogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
