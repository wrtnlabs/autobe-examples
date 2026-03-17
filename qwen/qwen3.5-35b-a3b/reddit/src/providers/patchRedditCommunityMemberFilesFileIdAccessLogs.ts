import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityFileAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityFileAccessLog";
import { IRedditCommunityFileAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileAccessLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberFilesFileIdAccessLogs(props: {
  member: MemberPayload;
  fileId: string & tags.Format<"uuid">;
  body: IRedditCommunityFileAccessLog.IRequest;
}): Promise<IPageIRedditCommunityFileAccessLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.reddit_community_file_access_logsWhereInput = {
    reddit_community_file_id: props.fileId,
    deleted_at: null,
    ...(props.body.fromCreatedAt && {
      created_at: { gte: new Date(props.body.fromCreatedAt) },
    }),
    ...(props.body.toCreatedAt && {
      created_at: { lte: new Date(props.body.toCreatedAt) },
    }),
    ...(props.body.accessType && {
      access_type: props.body.accessType,
    }),
    ...(props.body.statusCode !== undefined && {
      status_code: props.body.statusCode,
    }),
    ...(props.body.actorType && {
      actor_type: props.body.actorType,
    }),
    ...(props.body.minResponseSize !== undefined && {
      response_size: { gte: props.body.minResponseSize },
    }),
    ...(props.body.maxResponseSize !== undefined && {
      response_size: { lte: props.body.maxResponseSize },
    }),
    ...(props.body.minResponseTimeMs !== undefined && {
      response_time_ms: { gte: props.body.minResponseTimeMs },
    }),
    ...(props.body.maxResponseTimeMs !== undefined && {
      response_time_ms: { lte: props.body.maxResponseTimeMs },
    }),
  } satisfies Prisma.reddit_community_file_access_logsWhereInput;
  // Build orderBy clause
  const orderByInput = (
    props.body.sortField
      ? {
          [props.body.sortField]:
            props.body.sortOrder === "asc" ? "asc" : "desc",
        }
      : { created_at: "desc" as const }
  ) satisfies Prisma.reddit_community_file_access_logsOrderByWithRelationInput;
  // Query data
  const data = await MyGlobal.prisma.reddit_community_file_access_logs.findMany(
    {
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      select: {
        id: true,
        access_type: true,
        status_code: true,
        response_size: true,
        response_time_ms: true,
        actor_type: true,
        created_at: true,
      } satisfies Prisma.reddit_community_file_access_logsSelect,
    },
  );
  // Query total count
  const total = await MyGlobal.prisma.reddit_community_file_access_logs.count({
    where: whereInput,
  });
  // Transform and return
  const transformedData = data.map(
    (log) =>
      ({
        id: log.id,
        accessType: typia.assert<"download" | "view" | "thumbnail">(
          log.access_type,
        ),
        statusCode: log.status_code,
        responseSize: log.response_size,
        responseTimeMs: log.response_time_ms,
        actorType: typia.assert<"guest" | "member">(log.actor_type),
        createdAt: toISOStringSafe(log.created_at),
      }) satisfies IRedditCommunityFileAccessLog.ISummary,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
