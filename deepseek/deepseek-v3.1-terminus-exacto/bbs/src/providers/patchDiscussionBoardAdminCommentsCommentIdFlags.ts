import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardCommentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentFlag";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardCommentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentFlag";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminCommentsCommentIdFlags(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  body: IDiscussionBoardCommentFlag.IRequest;
}): Promise<IPageIDiscussionBoardCommentFlag.ISummary> {
  // Verify comment exists
  await MyGlobal.prisma.discussion_board_comments.findUniqueOrThrow({
    where: { id: props.commentId },
  });
  // Build where conditions
  const whereInput: Prisma.discussion_board_comment_flagsWhereInput = {
    comment_id: props.commentId,
    ...(props.body.status_filter && { status: props.body.status_filter }),
    ...(props.body.flag_type_filter && {
      flag_type: props.body.flag_type_filter,
    }),
    ...(props.body.search && {
      OR: [
        { flag_reason: { contains: props.body.search } },
        { resolution_notes: { contains: props.body.search } },
      ],
    }),
  };
  // Pagination parameters with validation
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100); // Enforce maximum limit
  const skip = (page - 1) * limit;
  // Sort order
  const orderByInput =
    props.body.sort === "oldest_first"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const };
  // Get paginated data
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_comment_flags.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        flag_type: true,
        status: true,
        created_at: true,
        user: {
          select: {
            id: true,
            display_name: true,
            bio: true,
            created_at: true,
          } satisfies Prisma.discussion_board_usersFindManyArgs["select"],
        },
        reviewer: {
          select: {
            id: true,
            email: true,
            display_name: true,
            created_at: true,
          } satisfies Prisma.discussion_board_adminsFindManyArgs["select"],
        },
      },
    }),
    MyGlobal.prisma.discussion_board_comment_flags.count({
      where: whereInput,
    }),
  ]);
  // Transform response
  const transformedData: IDiscussionBoardCommentFlag.ISummary[] = data.map(
    (flag) => ({
      id: flag.id as string & tags.Format<"uuid">,
      flag_type: flag.flag_type,
      status: flag.status,
      user: {
        id: flag.user.id as string & tags.Format<"uuid">,
        display_name: flag.user.display_name,
        bio: flag.user.bio ?? undefined,
        created_at: toISOStringSafe(flag.user.created_at),
      } satisfies IDiscussionBoardUser.ISummary,
      reviewer: flag.reviewer
        ? ({
            id: flag.reviewer.id as string & tags.Format<"uuid">,
            email: flag.reviewer.email,
            display_name: flag.reviewer.display_name,
            created_at: toISOStringSafe(flag.reviewer.created_at),
          } satisfies IDiscussionBoardAdmin.ISummary)
        : undefined,
      created_at: toISOStringSafe(flag.created_at),
    }),
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
