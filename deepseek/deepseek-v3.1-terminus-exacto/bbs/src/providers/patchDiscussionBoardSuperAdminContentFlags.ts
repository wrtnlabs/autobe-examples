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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardContentFlagAtSummaryTransformer } from "../transformers/DiscussionBoardContentFlagAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminContentFlags(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardContentFlag.IRequest;
}): Promise<IPageIDiscussionBoardContentFlag.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions with proper date handling
  const whereInput: Prisma.discussion_board_content_flagsWhereInput = {
    deleted_at: null,
    ...(props.body.status !== undefined &&
      props.body.status !== null && { status: props.body.status }),
    ...(props.body.reporter_user_id !== undefined &&
      props.body.reporter_user_id !== null && {
        reporter_user_id: props.body.reporter_user_id,
      }),
    ...(props.body.flagged_article_id !== undefined &&
      props.body.flagged_article_id !== null && {
        flagged_article_id: props.body.flagged_article_id,
      }),
    ...(props.body.flagged_comment_id !== undefined &&
      props.body.flagged_comment_id !== null && {
        flagged_comment_id: props.body.flagged_comment_id,
      }),
    ...(props.body.reviewing_admin_id !== undefined &&
      props.body.reviewing_admin_id !== null && {
        reviewing_admin_id: props.body.reviewing_admin_id,
      }),
    ...(props.body.created_at_min !== undefined &&
      props.body.created_at_min !== null && {
        created_at: { gte: props.body.created_at_min },
      }),
    ...(props.body.created_at_max !== undefined &&
      props.body.created_at_max !== null && {
        created_at: { lte: props.body.created_at_max },
      }),
    ...(props.body.resolved_at_min !== undefined &&
      props.body.resolved_at_min !== null && {
        resolved_at: { gte: props.body.resolved_at_min },
      }),
    ...(props.body.resolved_at_max !== undefined &&
      props.body.resolved_at_max !== null && {
        resolved_at: { lte: props.body.resolved_at_max },
      }),
    ...(props.body.flag_reason !== undefined &&
      props.body.flag_reason !== null && {
        flag_reason: {
          contains: props.body.flag_reason,
          mode: "insensitive",
        },
      }),
  };
  // Sequential await for database operations
  const data = await MyGlobal.prisma.discussion_board_content_flags.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...DiscussionBoardContentFlagAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_content_flags.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardContentFlagAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
