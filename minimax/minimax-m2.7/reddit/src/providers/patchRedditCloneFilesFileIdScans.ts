import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneFileScan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneFileScanTransformer } from "../transformers/RedditCloneFileScanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneFilesFileIdScans(props: {
  fileId: string & tags.Format<"uuid">;
  body: IRedditCloneFileScan.IRequest;
}): Promise<IPageIRedditCloneFileScan> {
  // Verify file exists first - returns 404 if not found
  await MyGlobal.prisma.reddit_clone_files.findUniqueOrThrow({
    where: { id: props.fileId },
    select: { id: true },
  });
  // Pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build date range filter
  const scannedFrom = props.body.scanned_from
    ? new Date(props.body.scanned_from)
    : undefined;
  const scannedTo = props.body.scanned_to
    ? new Date(props.body.scanned_to)
    : undefined;
  // Build where clause with filters
  const whereInput = {
    reddit_clone_file_id: props.fileId,
    ...(props.body.scanner && { scanner: props.body.scanner }),
    ...(props.body.status && { status: props.body.status }),
    ...(scannedFrom && { scanned_at: { gte: scannedFrom } }),
    ...(scannedTo && {
      scanned_at: {
        ...(scannedFrom ? { gte: scannedFrom } : {}),
        lte: scannedTo,
      },
    }),
  } satisfies Prisma.reddit_clone_file_scansWhereInput;
  // Fetch paginated scan records ordered by scanned_at descending
  const data = await MyGlobal.prisma.reddit_clone_file_scans.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { scanned_at: "desc" },
    ...RedditCloneFileScanTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.reddit_clone_file_scans.count({
    where: whereInput,
  });
  // Return paginated response
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCloneFileScanTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
