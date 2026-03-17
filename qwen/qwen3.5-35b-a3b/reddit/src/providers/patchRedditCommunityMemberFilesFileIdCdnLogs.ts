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
import { RedditCommunityFileCdnLogAtSummaryTransformer } from "../transformers/RedditCommunityFileCdnLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberFilesFileIdCdnLogs(props: {
  member: MemberPayload;
  fileId: string & tags.Format<"uuid">;
  body: IRedditCommunityFileCdnLog.IRequest;
}): Promise<IPageIRedditCommunityFileCdnLog.ISummary> {
  await MyGlobal.prisma.reddit_community_files.findUniqueOrThrow({
    where: {
      id: props.fileId,
      deleted_at: null,
    },
  });
  const page = props.body.page ?? 1;
  const perPage = props.body.per_page ?? 20;
  const limit = props.body.limit ?? perPage;
  const skip = (page - 1) * limit;
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
      user_agent: {
        contains: props.body.user_agent,
        mode: "insensitive" as const,
      },
    }),
  } satisfies Prisma.reddit_community_file_cdn_logsWhereInput;
  const orderByInput: Prisma.reddit_community_file_cdn_logsOrderByWithRelationInput[] =
    [
      props.body.sort === "delivered_at" || props.body.sort === undefined
        ? { delivered_at: (props.body.order ?? "desc") as "asc" | "desc" }
        : {
            response_size_bytes: (props.body.order ?? "desc") as "asc" | "desc",
          },
    ] satisfies Prisma.reddit_community_file_cdn_logsOrderByWithRelationInput[];
  const data = await MyGlobal.prisma.reddit_community_file_cdn_logs.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...RedditCommunityFileCdnLogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_file_cdn_logs.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityFileCdnLogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
