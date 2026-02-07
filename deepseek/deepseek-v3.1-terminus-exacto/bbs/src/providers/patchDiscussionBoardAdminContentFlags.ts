import { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
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

export async function patchDiscussionBoardAdminContentFlags(props: {
  admin: AdminPayload;
  body: IDiscussionBoardContentFlag.IRequest;
}): Promise<IPageIDiscussionBoardContentFlag.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions using string dates directly (no Date objects)
  const whereInput: Prisma.discussion_board_content_flagsWhereInput = {
    deleted_at: null,
    ...(props.body.status !== undefined &&
      props.body.status !== null && { status: props.body.status }),
    ...(props.body.reporter_user_id && {
      reporter_user_id: props.body.reporter_user_id,
    }),
    ...(props.body.flagged_article_id && {
      flagged_article_id: props.body.flagged_article_id,
    }),
    ...(props.body.flagged_comment_id && {
      flagged_comment_id: props.body.flagged_comment_id,
    }),
    ...(props.body.reviewing_admin_id && {
      reviewing_admin_id: props.body.reviewing_admin_id,
    }),
    ...(props.body.flag_reason && {
      flag_reason: { contains: props.body.flag_reason },
    }),
    ...(props.body.created_at_min && {
      created_at: { gte: props.body.created_at_min },
    }),
    ...(props.body.created_at_max && {
      created_at: { lte: props.body.created_at_max },
    }),
    ...(props.body.resolved_at_min && {
      resolved_at: props.body.resolved_at_min
        ? { gte: props.body.resolved_at_min }
        : null,
    }),
    ...(props.body.resolved_at_max && {
      resolved_at: props.body.resolved_at_max
        ? { lte: props.body.resolved_at_max }
        : null,
    }),
  };
  // Sequential execution as required (not Promise.all)
  const data = await MyGlobal.prisma.discussion_board_content_flags.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" } as const,
  });
  const total = await MyGlobal.prisma.discussion_board_content_flags.count({
    where: whereInput,
  });
  const transformedData: IDiscussionBoardContentFlag.ISummary[] = data.map(
    (flag) => ({
      id: flag.id as string & tags.Format<"uuid">,
      flag_reason: flag.flag_reason,
      status: flag.status,
      created_at: toISOStringSafe(flag.created_at) as string &
        tags.Format<"date-time">,
      resolved_at: flag.resolved_at
        ? (toISOStringSafe(flag.resolved_at) as string &
            tags.Format<"date-time">)
        : null,
      reporter_user_id: flag.reporter_user_id as string & tags.Format<"uuid">,
      flagged_article_id: flag.flagged_article_id
        ? (flag.flagged_article_id as string & tags.Format<"uuid">)
        : null,
      flagged_comment_id: flag.flagged_comment_id
        ? (flag.flagged_comment_id as string & tags.Format<"uuid">)
        : null,
    }),
  );
  return {
    data: transformedData,
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
