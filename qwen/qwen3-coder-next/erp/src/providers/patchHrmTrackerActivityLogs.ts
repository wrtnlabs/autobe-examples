import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerActivityLog";
import { IHrmTrackerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerGuest";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTrackerActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerActivityLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTrackerActivityLogAtSummaryTransformer } from "../transformers/HrmTrackerActivityLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTrackerActivityLogs(props: {
  body: IHrmTrackerActivityLog.IRequest;
}): Promise<IPageIHrmTrackerActivityLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.hrm_tracker_activity_logsWhereInput = {
    AND: [
      props.body.actor_member_id && {
        actorMember: { id: props.body.actor_member_id },
      },
      props.body.actor_guest_id && {
        actorGuest: { id: props.body.actor_guest_id },
      },
      props.body.target_entity_type && {
        target_entity_type: {
          equals: props.body.target_entity_type,
          mode: Prisma.QueryMode.insensitive,
        },
      },
      props.body.target_entity_id && {
        target_entity_id: {
          equals: props.body.target_entity_id,
          mode: Prisma.QueryMode.insensitive,
        },
      },
      props.body.action_type && {
        action_type: {
          equals: props.body.action_type,
          mode: Prisma.QueryMode.insensitive,
        },
      },
      (props.body.created_at_gte || props.body.created_at_lte) && {
        created_at:
          props.body.created_at_gte && props.body.created_at_lte
            ? {
                gte: new Date(props.body.created_at_gte!),
                lte: new Date(props.body.created_at_lte!),
              }
            : props.body.created_at_gte
              ? { gte: new Date(props.body.created_at_gte!) }
              : { lte: new Date(props.body.created_at_lte!) },
      },
    ].filter(Boolean) as Prisma.hrm_tracker_activity_logsWhereInput[],
  };
  const orderBy =
    props.body.sort === "-created_at"
      ? { created_at: Prisma.SortOrder.desc }
      : props.body.sort === "created_at"
        ? { created_at: Prisma.SortOrder.asc }
        : { created_at: Prisma.SortOrder.desc };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.hrm_tracker_activity_logs.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...HrmTrackerActivityLogAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrm_tracker_activity_logs.count({ where }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmTrackerActivityLogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
