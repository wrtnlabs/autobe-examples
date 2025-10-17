import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardBlockedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBlockedUser";
import { IPageIDiscussionBoardBlockedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBlockedUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchDiscussionBoardMemberUsersUserIdBlockedUsers(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardBlockedUser.IRequest;
}): Promise<IPageIDiscussionBoardBlockedUser.ISummary> {
  const { member, userId, body } = props;

  // Authorization: Verify member owns this blocked list
  if (member.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only view your own blocked users list",
      403,
    );
  }

  // Parse pagination parameters with defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Determine sort field and order
  const sortBy = body.sort_by ?? "created_at_desc";

  // Execute queries with all parameters inline
  const [blocks, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_blocked_users.findMany({
      where: {
        blocker_id: userId,
        deleted_at: null,
        ...(body.username !== null &&
          body.username !== undefined && {
            blocked: {
              username: {
                contains: body.username,
              },
            },
          }),
        ...((body.created_after !== null && body.created_after !== undefined) ||
        (body.created_before !== null && body.created_before !== undefined)
          ? {
              created_at: {
                ...(body.created_after !== null &&
                  body.created_after !== undefined && {
                    gte: body.created_after,
                  }),
                ...(body.created_before !== null &&
                  body.created_before !== undefined && {
                    lte: body.created_before,
                  }),
              },
            }
          : {}),
      },
      include: {
        blocked: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
          },
        },
      },
      orderBy:
        sortBy === "created_at_asc"
          ? { created_at: "asc" }
          : sortBy === "username_asc"
            ? { blocked: { username: "asc" } }
            : sortBy === "username_desc"
              ? { blocked: { username: "desc" } }
              : { created_at: "desc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_blocked_users.count({
      where: {
        blocker_id: userId,
        deleted_at: null,
        ...(body.username !== null &&
          body.username !== undefined && {
            blocked: {
              username: {
                contains: body.username,
              },
            },
          }),
        ...((body.created_after !== null && body.created_after !== undefined) ||
        (body.created_before !== null && body.created_before !== undefined)
          ? {
              created_at: {
                ...(body.created_after !== null &&
                  body.created_after !== undefined && {
                    gte: body.created_after,
                  }),
                ...(body.created_before !== null &&
                  body.created_before !== undefined && {
                    lte: body.created_before,
                  }),
              },
            }
          : {}),
      },
    }),
  ]);

  // Transform results to match API response schema
  const data: IDiscussionBoardBlockedUser.ISummary[] = blocks.map((block) => ({
    id: block.id,
    blocked_user: {
      id: block.blocked.id,
      username: block.blocked.username,
      display_name: block.blocked.display_name ?? null,
      avatar_url: block.blocked.avatar_url ?? null,
    },
    reason: block.reason ?? null,
    created_at: toISOStringSafe(block.created_at),
  }));

  // Calculate pagination metadata
  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data: data,
  };
}
