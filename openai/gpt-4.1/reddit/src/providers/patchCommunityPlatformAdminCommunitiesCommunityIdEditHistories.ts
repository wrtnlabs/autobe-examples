import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityEditHistory";
import { IPageICommunityPlatformCommunityEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityEditHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminCommunitiesCommunityIdEditHistories(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityEditHistory.IRequest;
}): Promise<IPageICommunityPlatformCommunityEditHistory> {
  const { admin, communityId, body } = props;
  const page = body.page && body.page > 0 ? body.page : 1;
  const limit = body.limit && body.limit > 0 ? body.limit : 20;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Record<string, unknown> = {
    community_platform_community_id: communityId,
    // Additional filters applied below
  };
  if (body.edit_date_range_start !== undefined) {
    where.edited_at = Object.assign(where.edited_at ?? {}, {
      gte: body.edit_date_range_start,
    });
  }
  if (body.edit_date_range_end !== undefined) {
    where.edited_at = Object.assign(where.edited_at ?? {}, {
      lte: body.edit_date_range_end,
    });
  }

  // Editor display_name fuzzy search: requires user join/IN subquery
  if (
    body.search_editor_name !== undefined &&
    body.search_editor_name.length > 0
  ) {
    // Find matching user IDs
    const matchedEditors =
      await MyGlobal.prisma.community_platform_users.findMany({
        where: {
          display_name: { contains: body.search_editor_name },
          deleted_at: null,
        },
        select: { id: true },
      });
    const editorIds = matchedEditors.map((e) => e.id);
    if (editorIds.length === 0) {
      return {
        pagination: {
          current: page satisfies number as number,
          limit: limit satisfies number as number,
          records: 0 satisfies number as number,
          pages: 0 satisfies number as number,
        },
        data: [],
      };
    }
    where.editor_user_id = { in: editorIds };
  }

  const [total, rows] = await Promise.all([
    MyGlobal.prisma.community_platform_community_edit_histories.count({
      where,
    }),
    MyGlobal.prisma.community_platform_community_edit_histories.findMany({
      where,
      orderBy: { edited_at: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    community_platform_community_id: row.community_platform_community_id,
    editor_user_id: row.editor_user_id,
    name: row.name,
    description: row.description,
    edited_at: toISOStringSafe(row.edited_at),
  }));

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    },
    data,
  };
}
