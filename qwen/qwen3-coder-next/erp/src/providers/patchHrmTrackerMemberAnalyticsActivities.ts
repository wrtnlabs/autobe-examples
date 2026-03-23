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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerActivityLogAtSummaryTransformer } from "../transformers/HrmTrackerActivityLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTrackerMemberAnalyticsActivities(props: {
  member: MemberPayload;
  body: IHrmTrackerActivityLog.IRequest;
}): Promise<IPageIHrmTrackerActivityLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.hrm_tracker_activity_logsWhereInput = {
    ...(props.body.actor_member_id && {
      actor_member_id: props.body.actor_member_id,
    }),
    ...(props.body.actor_guest_id && {
      actor_guest_id: props.body.actor_guest_id,
    }),
    ...(props.body.target_entity_type && {
      target_entity_type: {
        equals: props.body.target_entity_type,
        mode: "insensitive",
      },
    }),
    ...(props.body.target_entity_id && {
      target_entity_id: props.body.target_entity_id,
    }),
    ...(props.body.action_type && {
      action_type: {
        equals: props.body.action_type,
        mode: "insensitive",
      },
    }),
    ...(props.body.created_at_gte && {
      created_at: {
        gte: new Date(props.body.created_at_gte),
      },
    }),
    ...(props.body.created_at_lte && {
      created_at: {
        lte: new Date(props.body.created_at_lte),
      },
    }),
  };
  const orderByInput:
    | Prisma.hrm_tracker_activity_logsOrderByWithRelationInput
    | Prisma.hrm_tracker_activity_logsOrderByWithRelationInput[] =
    props.body.sort === "-created_at"
      ? { created_at: "desc" }
      : { created_at: "asc" };
  const data = await MyGlobal.prisma.hrm_tracker_activity_logs.findMany({
    where,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmTrackerActivityLogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_tracker_activity_logs.count({
    where,
  });
  const mappedData = await ArrayUtil.asyncMap(
    data,
    async (item) =>
      await HrmTrackerActivityLogAtSummaryTransformer.transform(item),
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: mappedData,
  } satisfies IPageIHrmTrackerActivityLog.ISummary;
}
