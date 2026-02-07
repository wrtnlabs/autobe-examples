import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratedContentHistory";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModeratedContentHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardModeratedContentHistoryAtSummaryTransformer } from "../transformers/DiscussionBoardModeratedContentHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminModeratedContentHistories(props: {
  admin: AdminPayload;
  body: IDiscussionBoardModeratedContentHistory.IRequest;
}): Promise<IPageIDiscussionBoardModeratedContentHistory.ISummary> {
  // Verify admin authorization
  const adminRecord = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: {
      id: props.admin.id,
      deleted_at: null,
    },
  });
  if (!adminRecord) {
    throw new HttpException("Administrator not found or unauthorized", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build comprehensive WHERE conditions
  const whereInput: Prisma.discussion_board_moderated_content_historiesWhereInput =
    {
      ...(props.body.content_type && { content_type: props.body.content_type }),
      ...(props.body.moderator_admin_id && {
        moderator_admin_id: props.body.moderator_admin_id,
      }),
      ...(props.body.moderator_super_admin_id && {
        moderator_super_admin_id: props.body.moderator_super_admin_id,
      }),
      ...(props.body.moderation_reason && {
        moderation_reason: {
          contains: props.body.moderation_reason,
          mode: "insensitive",
        },
      }),
      ...(props.body.original_content && {
        original_content: {
          contains: props.body.original_content,
          mode: "insensitive",
        },
      }),
      ...(props.body.created_at_start && {
        created_at: {
          gte: new Date(props.body.created_at_start),
        },
      }),
      ...(props.body.created_at_end && {
        created_at: {
          lte: new Date(props.body.created_at_end),
        },
      }),
      ...(props.body.search && {
        OR: [
          {
            moderation_reason: {
              contains: props.body.search,
              mode: "insensitive",
            },
          },
          {
            original_content: {
              contains: props.body.search,
              mode: "insensitive",
            },
          },
        ],
      }),
    };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_moderated_content_histories.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardModeratedContentHistoryAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_moderated_content_histories.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardModeratedContentHistoryAtSummaryTransformer.transform,
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
