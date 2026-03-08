import { IDiscussionBoardMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardMemberPasswordResets(props: {
  member: MemberPayload;
  body: IDiscussionBoardMemberPasswordReset.IRequest;
}): Promise<IPageIDiscussionBoardMemberPasswordReset.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause for filtering
  const where: Prisma.discussion_board_member_password_resetsWhereInput = {
    discussion_board_member_id:
      props.body.discussion_board_member_id ?? undefined,
    expires_at:
      props.body.expires_after || props.body.expires_before
        ? {
            gte: props.body.expires_after ?? undefined,
            lte: props.body.expires_before ?? undefined,
          }
        : undefined,
    created_at:
      props.body.created_after || props.body.created_before
        ? {
            gte: props.body.created_after ?? undefined,
            lte: props.body.created_before ?? undefined,
          }
        : undefined,
    used_at:
      props.body.used_after || props.body.used_before
        ? {
            gte: (props.body.used_after as any) ?? undefined,
            lte: (props.body.used_before as any) ?? undefined,
          }
        : undefined,
    deleted_at: null,
  };
  // Apply status filter if specified
  if (props.body.status) {
    const now = toISOStringSafe(new Date());
    switch (props.body.status) {
      case "pending":
        where.AND = [
          {
            used_at: null,
            expires_at: { gte: now },
          },
        ];
        break;
      case "used":
        where.AND = [
          {
            used_at: { not: null },
          },
        ];
        break;
      case "expired":
        where.AND = [
          {
            used_at: null,
            expires_at: { lt: now },
          },
        ];
        break;
    }
  }
  // Fetch records
  const data =
    await MyGlobal.prisma.discussion_board_member_password_resets.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
  // Count total for pagination
  const total =
    await MyGlobal.prisma.discussion_board_member_password_resets.count({
      where,
    });
  // Transform to response DTO
  const now = toISOStringSafe(new Date());
  const response = data.map((record) => {
    // Compute status
    let status: "pending" | "used" | "expired" = "pending";
    if (record.used_at) {
      status = "used";
    } else if (record.expires_at < new Date(now)) {
      status = "expired";
    }
    return {
      id: record.id as string & tags.Format<"uuid">,
      member_id: record.discussion_board_member_id,
      status,
      expires_at: toISOStringSafe(record.expires_at) as string &
        tags.Format<"date-time">,
      used_at: record.used_at
        ? (toISOStringSafe(record.used_at) as string & tags.Format<"date-time">)
        : null,
      created_at: toISOStringSafe(record.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(record.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at: record.deleted_at
        ? (toISOStringSafe(record.deleted_at) as string &
            tags.Format<"date-time">)
        : null,
    };
  });
  return {
    data: response,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
