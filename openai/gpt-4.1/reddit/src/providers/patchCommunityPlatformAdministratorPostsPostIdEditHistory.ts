import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPostEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostEditHistory";
import { IPageICommunityPlatformPostEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostEditHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorPostsPostIdEditHistory(props: {
  administrator: AdministratorPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostEditHistory.IRequest;
}): Promise<IPageICommunityPlatformPostEditHistory> {
  // Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build filter conditions
  const where: Record<string, unknown> = {
    post_id: props.postId,
    ...(props.body.userId && { user_id: props.body.userId }),
    ...(props.body.fromDate && { created_at: { gte: props.body.fromDate } }),
    ...(props.body.toDate && {
      created_at: {
        ...(props.body.fromDate ? { gte: props.body.fromDate } : {}),
        lte: props.body.toDate,
      },
    }),
  };
  // Add keyword search logic
  if (props.body.search) {
    // Full text search on old_title, new_title, old_body, new_body (case-insensitive partial match)
    where.OR = [
      { old_title: { contains: props.body.search, mode: "insensitive" } },
      { new_title: { contains: props.body.search, mode: "insensitive" } },
      { old_body: { contains: props.body.search, mode: "insensitive" } },
      { new_body: { contains: props.body.search, mode: "insensitive" } },
    ];
  }

  // Query edit history and total count concurrently
  const [records, total] = await Promise.all([
    MyGlobal.prisma.community_platform_post_edit_history.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        user: true,
        userSession: true,
      },
    }),
    MyGlobal.prisma.community_platform_post_edit_history.count({ where }),
  ]);

  // Construct API result
  return {
    data: records.map((rec) => ({
      id: rec.id,
      post_id: rec.post_id,
      user: {
        id: rec.user_id,
      },
      userSession: {
        id: rec.user_session_id,
        created_at: toISOStringSafe(rec.userSession?.created_at),
      },
      old_title:
        rec.old_title === undefined
          ? undefined
          : rec.old_title === null
            ? null
            : rec.old_title,
      old_body:
        rec.old_body === undefined
          ? undefined
          : rec.old_body === null
            ? null
            : rec.old_body,
      new_title:
        rec.new_title === undefined
          ? undefined
          : rec.new_title === null
            ? null
            : rec.new_title,
      new_body:
        rec.new_body === undefined
          ? undefined
          : rec.new_body === null
            ? null
            : rec.new_body,
      edit_reason:
        rec.edit_reason === undefined
          ? undefined
          : rec.edit_reason === null
            ? null
            : rec.edit_reason,
      created_at: toISOStringSafe(rec.created_at),
    })),
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
