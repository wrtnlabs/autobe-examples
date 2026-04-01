import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunitySystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySystemLog";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunitySystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemLog";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunitySystemLogs(props: {
  body: IRedditCommunitySystemLog.IRequest;
}): Promise<IPageIRedditCommunitySystemLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 50;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_community_system_logsWhereInput = {
    deleted_at: props.body.exclude_deleted ? null : undefined,
    ...(props.body.created_at_start && {
      created_at: { gte: props.body.created_at_start },
    }),
    ...(props.body.created_at_end && {
      created_at: { lte: props.body.created_at_end },
    }),
    ...(props.body.activity_type && {
      activity_type: props.body.activity_type,
    }),
    ...(props.body.action_performed && {
      action_performed: props.body.action_performed,
    }),
    ...(props.body.target_type && { target_type: props.body.target_type }),
    ...(props.body.actor_id && { actor_id: props.body.actor_id }),
    ...(props.body.target_post_id && {
      target_post_id: props.body.target_post_id,
    }),
    ...(props.body.target_comment_id && {
      target_comment_id: props.body.target_comment_id,
    }),
    ...(props.body.target_community_id && {
      target_community_id: props.body.target_community_id,
    }),
    ...(props.body.target_report_id && {
      target_report_id: props.body.target_report_id,
    }),
  };
  const orderByInput = (
    props.body.order === "asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.reddit_community_system_logsOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_system_logs.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      select: {
        id: true,
        activity_type: true,
        action_performed: true,
        actor_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.reddit_community_system_logs.count({ where: whereInput }),
  ]);
  const mappedData = await ArrayUtil.asyncMap(data, async (log) => {
    return {
      id: log.id as string & tags.Format<"uuid">,
      activityType: log.activity_type,
      actionPerformed: log.action_performed,
      actor: log.actor_id
        ? ({
            id: log.actor_id as string & tags.Format<"uuid">,
            username: "",
            created_at: "",
            profile: undefined as
              | IRedditCommunityUserProfile.ISummary
              | undefined,
            karma: undefined,
          } satisfies IRedditCommunityMember.ISummary)
        : null,
      createdAt: toISOStringSafe(log.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: toISOStringSafe(log.updated_at) as string &
        tags.Format<"date-time">,
      deletedAt: log.deleted_at ? toISOStringSafe(log.deleted_at) : null,
    } satisfies IRedditCommunitySystemLog.ISummary;
  });
  return {
    data: mappedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditCommunitySystemLog.ISummary;
}
