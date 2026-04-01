import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityFileCdnLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityFileCdnLog";
import { IRedditCommunityFileCdnLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileCdnLog";
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

export async function patchRedditCommunityMemberFilesFileIdCdnLogs(props: {
  member: MemberPayload;
  fileId: string & tags.Format<"uuid">;
  body: IRedditCommunityFileCdnLog.IRequest;
}): Promise<IPageIRedditCommunityFileCdnLog.ISummary> {
  // Verify file exists and is accessible
  await MyGlobal.prisma.reddit_community_files.findUniqueOrThrow({
    where: { id: props.fileId, deleted_at: null },
    select: { id: true },
  });
  // Pagination parameters with defaults
  const page: number = props.body.page ?? 1;
  const perPage: number = props.body.per_page ?? 20;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * perPage;
  // Build WHERE clause from filters
  const whereInput: Prisma.reddit_community_file_cdn_logsWhereInput = {
    reddit_community_file_id: props.fileId,
    deleted_at: null,
    ...(props.body.cache_status !== undefined && {
      cache_status: props.body.cache_status,
    }),
    ...(props.body.delivered_at_start !== undefined && {
      delivered_at: { gte: new Date(props.body.delivered_at_start) },
    }),
    ...(props.body.delivered_at_end !== undefined && {
      delivered_at: { lte: new Date(props.body.delivered_at_end) },
    }),
    ...(props.body.region !== undefined && { region: props.body.region }),
    ...(props.body.http_status_code !== undefined && {
      http_status_code: props.body.http_status_code,
    }),
    ...(props.body.response_size_bytes_min !== undefined && {
      response_size_bytes: { gte: props.body.response_size_bytes_min },
    }),
    ...(props.body.response_size_bytes_max !== undefined && {
      response_size_bytes: { lte: props.body.response_size_bytes_max },
    }),
    ...(props.body.cdn_node_identifier !== undefined && {
      cdn_node_identifier: props.body.cdn_node_identifier,
    }),
    ...(props.body.user_agent !== undefined && {
      user_agent: { contains: props.body.user_agent },
    }),
  } satisfies Prisma.reddit_community_file_cdn_logsWhereInput;
  // Build ORDER BY clause
  const orderByInput: Prisma.reddit_community_file_cdn_logsOrderByWithRelationInput[] =
    props.body.sort === "response_size_bytes"
      ? [
          {
            response_size_bytes: (props.body.order ?? "desc") as "asc" | "desc",
          },
        ]
      : [
          {
            delivered_at: (props.body.order ?? "desc") as "asc" | "desc",
          },
        ];
  // Execute query
  const records = await MyGlobal.prisma.reddit_community_file_cdn_logs.findMany(
    {
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: perPage,
    },
  );
  // Get total count
  const total = await MyGlobal.prisma.reddit_community_file_cdn_logs.count({
    where: whereInput,
  });
  // Transform to DTO format
  const data: IRedditCommunityFileCdnLog.ISummary[] = records.map(
    (record): IRedditCommunityFileCdnLog.ISummary => ({
      id: record.id as string & tags.Format<"uuid">,
      cdnNodeIdentifier: record.cdn_node_identifier,
      cacheStatus: record.cache_status,
      httpStatusCode: record.http_status_code as number & tags.Type<"int32">,
      responseSizeBytes: record.response_size_bytes as number &
        tags.Type<"int32">,
      cacheHitBytes: record.cache_hit_bytes as number & tags.Type<"int32">,
      originFetchBytes: record.origin_fetch_bytes as number &
        tags.Type<"int32">,
      deliveredAt: record.delivered_at.toISOString() as string &
        tags.Format<"date-time">,
      userAgent: record.user_agent,
      ipAddress: record.ip_address,
      region: record.region,
    }),
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIRedditCommunityFileCdnLog.ISummary;
}
