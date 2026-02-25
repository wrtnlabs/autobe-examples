import { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardCommentSnapshotAtSummaryTransformer } from "../transformers/DiscussionBoardCommentSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminCommentsCommentIdSnapshots(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentSnapshot.IRequest;
}): Promise<IPageIDiscussionBoardCommentSnapshot.ISummary> {
  // Verify comment exists and admin has access
  await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
    where: { id: props.commentId },
    select: { id: true },
  });
  // Build filter conditions with correct date handling
  const whereFilter: Prisma.discussion_board_comment_snapshotsWhereInput = {
    discussion_board_comment_id: props.commentId,
    ...(props.body.version_number_min !== undefined && {
      version_number: { gte: props.body.version_number_min },
    }),
    ...(props.body.version_number_max !== undefined && {
      version_number: { lte: props.body.version_number_max },
    }),
    ...(props.body.snapshot_reason !== undefined && {
      snapshot_reason: {
        equals: props.body.snapshot_reason,
        mode: "insensitive",
      },
    }),
    ...(props.body.created_at_after !== undefined && {
      created_at: { gte: new Date(props.body.created_at_after) },
    }),
    ...(props.body.created_at_before !== undefined && {
      created_at: { lte: new Date(props.body.created_at_before) },
    }),
  };
  // Pagination setup
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Fetch data with pagination
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comment_snapshots.findMany({
      where: whereFilter,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardCommentSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_comment_snapshots.count({
      where: whereFilter,
    }),
  ]);
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardCommentSnapshotAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
