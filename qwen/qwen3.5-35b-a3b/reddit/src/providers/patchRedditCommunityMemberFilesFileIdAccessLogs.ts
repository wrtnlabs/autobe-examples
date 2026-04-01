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
import { RedditCommunityFileAccessLogAtSummaryTransformer } from "../transformers/RedditCommunityFileAccessLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberFilesFileIdAccessLogs(props: {
  member: MemberPayload;
  fileId: string & tags.Format<"uuid">;
  body: IRedditCommunityFileAccessLog.IRequest;
}): Promise<IPageIRedditCommunityFileAccessLog.ISummary> {
  const page: number & tags.Type<"int32"> = props.body.page ?? 1;
  const limit: number & tags.Type<"int32"> = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const whereInput: Prisma.reddit_community_file_access_logsWhereInput = {
    reddit_community_file_id: props.fileId,
    deleted_at: null,
    ...(props.body.fromCreatedAt !== undefined && {
      created_at: { gte: new Date(props.body.fromCreatedAt) },
    }),
    ...(props.body.toCreatedAt !== undefined && {
      created_at: { lte: new Date(props.body.toCreatedAt) },
    }),
    ...(props.body.accessType !== undefined && {
      access_type: props.body.accessType,
    }),
    ...(props.body.statusCode !== undefined && {
      status_code: props.body.statusCode,
    }),
    ...(props.body.actorType !== undefined && {
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
  const orderByInput: Prisma.reddit_community_file_access_logsOrderByWithRelationInput =
    (
      props.body.sortField !== undefined
        ? {
            [props.body
              .sortField as keyof Prisma.reddit_community_file_access_logsOrderByWithRelationInput]:
              props.body.sortOrder ?? "desc",
          }
        : { created_at: "desc" as const }
    ) satisfies Prisma.reddit_community_file_access_logsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_community_file_access_logs.findMany(
    {
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...RedditCommunityFileAccessLogAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.reddit_community_file_access_logs.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit) satisfies number as number,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityFileAccessLogAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditCommunityFileAccessLog.ISummary;
}
