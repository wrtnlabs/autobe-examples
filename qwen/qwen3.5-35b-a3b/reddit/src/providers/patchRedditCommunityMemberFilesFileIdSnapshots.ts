import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityFileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityFileSnapshot";
import { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import { IRedditCommunityFileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityFileSnapshotAtSummaryTransformer } from "../transformers/RedditCommunityFileSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberFilesFileIdSnapshots(props: {
  member: MemberPayload;
  fileId: string & tags.Format<"uuid">;
  body: IRedditCommunityFileSnapshot.IRequest;
}): Promise<IPageIRedditCommunityFileSnapshot.ISummary> {
  // Validate file exists
  const file = await MyGlobal.prisma.reddit_community_files.findFirst({
    where: {
      id: props.fileId,
    },
    select: { id: true },
  });
  if (file === null) {
    throw new HttpException("File not found", 404);
  }
  // Build pagination parameters
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? 20;
  const limit = props.body.limit ?? 100;
  // Build filter conditions
  const snapshotCreatedAtRange = props.body.snapshotCreatedAtRange;
  const createdAtRange = props.body.createdAtRange;
  const whereInput: Prisma.reddit_community_file_snapshotsWhereInput = {
    reddit_community_file_id: props.fileId,
    ...(snapshotCreatedAtRange !== undefined && {
      snapshot_created_at: {
        gte: snapshotCreatedAtRange.start,
        lte: snapshotCreatedAtRange.end,
      },
    }),
    ...(createdAtRange !== undefined && {
      created_at: {
        gte: createdAtRange.start,
        lte: createdAtRange.end,
      },
    }),
  } satisfies Prisma.reddit_community_file_snapshotsWhereInput;
  // Calculate skip for pagination (respecting limit)
  const skip = (page - 1) * pageSize;
  const take = limit < pageSize ? limit : pageSize;
  // Build order by input
  const sortBy = props.body.sortBy ?? "snapshot_created_at";
  const order = props.body.order ?? "desc";
  const orderByInput =
    sortBy === "created_at"
      ? ([
          {
            [sortBy]: order,
          },
        ] satisfies Prisma.reddit_community_file_snapshotsOrderByWithRelationInput[])
      : ([
          {
            snapshot_created_at: order,
          },
        ] satisfies Prisma.reddit_community_file_snapshotsOrderByWithRelationInput[]);
  // Query snapshots - use sequential awaits per guidelines
  const data = await MyGlobal.prisma.reddit_community_file_snapshots.findMany({
    where: whereInput,
    skip,
    take,
    orderBy: orderByInput,
    ...RedditCommunityFileSnapshotAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_file_snapshots.count({
    where: whereInput,
  });
  const totalPages = Math.ceil(total / pageSize);
  const transformedData = (await ArrayUtil.asyncMap(
    data,
    RedditCommunityFileSnapshotAtSummaryTransformer.transform,
  )) satisfies IRedditCommunityFileSnapshot.ISummary[];
  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIRedditCommunityFileSnapshot.ISummary;
}
