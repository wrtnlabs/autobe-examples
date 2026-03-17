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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberFilesFileIdSnapshots(props: {
  member: MemberPayload;
  fileId: string & tags.Format<"uuid">;
  body: IRedditCommunityFileSnapshot.IRequest;
}): Promise<IPageIRedditCommunityFileSnapshot.ISummary> {
  // Validate file exists and is not deleted
  const file = await MyGlobal.prisma.reddit_community_files.findUniqueOrThrow({
    where: {
      id: props.fileId,
      deleted_at: null,
    },
  });
  // Build pagination parameters
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? 20;
  const limit = props.body.limit ?? pageSize;
  const skip = (page - 1) * limit;
  // Build WHERE clause with filters using string comparisons for date-time fields
  const whereInput: Prisma.reddit_community_file_snapshotsWhereInput = {
    reddit_community_file_id: props.fileId,
    ...(props.body.snapshotCreatedAtRange?.start && {
      snapshot_created_at: { gte: props.body.snapshotCreatedAtRange.start },
    }),
    ...(props.body.snapshotCreatedAtRange?.end && {
      snapshot_created_at: { lte: props.body.snapshotCreatedAtRange.end },
    }),
    ...(props.body.createdAtRange?.start && {
      created_at: { gte: props.body.createdAtRange.start },
    }),
    ...(props.body.createdAtRange?.end && {
      created_at: { lte: props.body.createdAtRange.end },
    }),
  };
  // Build ORDER BY clause
  const orderByInput = (
    props.body.sortBy === "created_at"
      ? [{ created_at: props.body.order === "asc" ? "asc" : "desc" }]
      : [{ snapshot_created_at: props.body.order === "asc" ? "asc" : "desc" }]
  ) satisfies Prisma.reddit_community_file_snapshotsOrderByWithRelationInput[];
  // Fetch paginated snapshots
  const data = await MyGlobal.prisma.reddit_community_file_snapshots.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    select: {
      id: true,
      snapshot_created_at: true,
      created_at: true,
      updated_at: true,
      file: {
        select: {
          id: true,
          file_type: true,
          mime_type: true,
          file_path: true,
          file_size: true,
          created_at: true,
        },
      },
    },
  });
  // Fetch total count
  const total = await MyGlobal.prisma.reddit_community_file_snapshots.count({
    where: whereInput,
  });
  // Transform results to DTO format using proper type resolution
  const transformedData: IRedditCommunityFileSnapshot.ISummary[] =
    await ArrayUtil.asyncMap(data, async (snapshot) => ({
      id: snapshot.id,
      snapshot_created_at: snapshot.snapshot_created_at.toISOString(),
      created_at: snapshot.created_at.toISOString(),
      updated_at: snapshot.updated_at.toISOString(),
      file: {
        id: snapshot.file.id,
        fileType: snapshot.file.file_type as
          | "user_avatar"
          | "post_image"
          | "community_icon",
        mimeType: snapshot.file.mime_type,
        filePath: snapshot.file.file_path,
        fileSize: snapshot.file.file_size,
        createdAt: snapshot.file.created_at.toISOString(),
      } satisfies IRedditCommunityFile.ISummary,
    }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIRedditCommunityFileSnapshot.ISummary;
}
