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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardModeratedContentHistoryAtSummaryTransformer } from "../transformers/DiscussionBoardModeratedContentHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminModeratedContentHistories(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardModeratedContentHistory.IRequest;
}): Promise<IPageIDiscussionBoardModeratedContentHistory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereConditions: Prisma.discussion_board_moderated_content_historiesWhereInput =
    {};
  // Content type filter
  if (props.body.content_type) {
    whereConditions.content_type = props.body.content_type;
  }
  // Moderator filters
  if (props.body.moderator_admin_id) {
    whereConditions.moderator_admin_id = props.body.moderator_admin_id;
  }
  if (props.body.moderator_super_admin_id) {
    whereConditions.moderator_super_admin_id =
      props.body.moderator_super_admin_id;
  }
  // Text search filters
  if (props.body.moderation_reason) {
    whereConditions.moderation_reason = {
      contains: props.body.moderation_reason,
      mode: "insensitive" as const,
    };
  }
  if (props.body.original_content) {
    whereConditions.original_content = {
      contains: props.body.original_content,
      mode: "insensitive" as const,
    };
  }
  // Date range filters
  if (props.body.created_at_start || props.body.created_at_end) {
    whereConditions.created_at = {};
    if (props.body.created_at_start) {
      whereConditions.created_at.gte = toISOStringSafe(
        props.body.created_at_start,
      );
    }
    if (props.body.created_at_end) {
      whereConditions.created_at.lte = toISOStringSafe(
        props.body.created_at_end,
      );
    }
  }
  // General search term
  if (props.body.search) {
    whereConditions.OR = [
      {
        moderation_reason: {
          contains: props.body.search,
          mode: "insensitive" as const,
        },
      },
      {
        original_content: {
          contains: props.body.search,
          mode: "insensitive" as const,
        },
      },
    ];
  }
  // Execute queries sequentially (not Promise.all to avoid race conditions)
  const data =
    await MyGlobal.prisma.discussion_board_moderated_content_histories.findMany(
      {
        where: whereConditions,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        ...DiscussionBoardModeratedContentHistoryAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.discussion_board_moderated_content_histories.count({
      where: whereConditions,
    });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardModeratedContentHistoryAtSummaryTransformer.transform,
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
