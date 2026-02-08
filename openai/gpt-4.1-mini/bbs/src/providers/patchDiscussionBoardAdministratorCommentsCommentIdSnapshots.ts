import { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorCommentsCommentIdSnapshots(props: {
  administrator: AdministratorPayload;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentSnapshot.IRequest;
}): Promise<IPageIDiscussionBoardCommentSnapshot.ISummary> {
  const comment = await MyGlobal.prisma.discussion_board_comments.findUnique({
    where: { id: props.commentId },
    select: { id: true },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  // Since 'page' and 'limit' do not exist on IRequest, use defaults
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  const whereInput = {
    discussion_board_comment_id: props.commentId,
    deleted_at: null,
  };
  const records =
    await MyGlobal.prisma.discussion_board_comment_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        discussion_board_comment_id: true,
        body: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const total = await MyGlobal.prisma.discussion_board_comment_snapshots.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((record) => ({
      id: record.id,
      comment_id: record.discussion_board_comment_id,
      body: record.body,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    })),
  };
}
