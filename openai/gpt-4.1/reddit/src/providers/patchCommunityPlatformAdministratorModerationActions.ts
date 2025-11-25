import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import { IPageICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorModerationActions(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformModerationAction.IRequest;
}): Promise<IPageICommunityPlatformModerationAction.ISummary> {
  const { body } = props;

  // Pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build dynamic Prisma where condition respecting only filter values provided
  const where = {
    ...(body.action_type !== undefined && { action_type: body.action_type }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.report_id !== undefined && { report_id: body.report_id }),
    ...(body.target_post_id !== undefined && {
      target_post_id: body.target_post_id,
    }),
    ...(body.target_comment_id !== undefined && {
      target_comment_id: body.target_comment_id,
    }),
    ...(body.target_community_id !== undefined && {
      target_community_id: body.target_community_id,
    }),
    ...(body.created_after !== undefined && {
      created_at: { gte: body.created_after },
    }),
    ...(body.created_before !== undefined && {
      created_at: {
        ...(body.created_after !== undefined
          ? { gte: body.created_after }
          : {}),
        lte: body.created_before,
      },
    }),
  };

  // Compose sorting clause
  const orderBy =
    body.sort_by && body.sort_order
      ? { [body.sort_by]: body.sort_order as Prisma.SortOrder }
      : { created_at: "desc" as Prisma.SortOrder };

  // Two queries in parallel: data (ids only), and total record count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_moderation_actions.findMany({
      where,
      orderBy: [orderBy],
      skip,
      take: limit,
      select: { id: true },
    }),
    MyGlobal.prisma.community_platform_moderation_actions.count({ where }),
  ]);

  return {
    data: rows.map((row) => ({ id: row.id })),
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
