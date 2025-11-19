import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardUserBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBookmark";
import { IPageIDiscussionBoardUserBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserBookmark";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchDiscussionBoardMemberMembersUsernameBookmarks(props: {
  member: MemberPayload;
  username: string;
  body: IDiscussionBoardUserBookmark.IRequest;
}): Promise<IPageIDiscussionBoardUserBookmark.ISummary> {
  // Verify the requesting member has permission to access the target member's bookmarks
  const targetMember = await MyGlobal.prisma.discussion_board_members.findFirst(
    {
      where: {
        username: props.username,
        deleted_at: null,
      },
    },
  );

  if (!targetMember) {
    throw new HttpException("Member not found", 404);
  }

  // Authorization check: members can only access their own bookmarks
  if (targetMember.id !== props.member.id) {
    throw new HttpException(
      "Forbidden: You can only access your own bookmarks",
      403,
    );
  }

  // Calculate pagination parameters
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Build search conditions
  const whereConditions: Record<string, unknown> = {
    discussion_board_member_id: targetMember.id,
    deleted_at: null,
  };

  // Add search query if provided and not empty
  if (props.body.search !== undefined && props.body.search !== "") {
    whereConditions.post = {
      OR: [
        { title: { contains: props.body.search, mode: "insensitive" } },
        { content: { contains: props.body.search, mode: "insensitive" } },
      ],
      deleted_at: null,
    };
  }

  // Build order by conditions
  const orderBy: Record<string, string> = {};
  const orderField = props.body.order_by ?? "created_at";
  const orderDirection = props.body.order_direction ?? "desc";

  orderBy[orderField] = orderDirection;

  // Execute paginated query
  const [bookmarks, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_user_bookmarks.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      include: {
        member: {
          select: {
            id: true,
            username: true,
            display_name: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            actor_type: true,
          },
        },
      },
    }),
    MyGlobal.prisma.discussion_board_user_bookmarks.count({
      where: whereConditions,
    }),
  ]);

  // Transform results to match API interface
  const data = bookmarks.map((bookmark) => ({
    id: bookmark.id,
    member: {
      id: bookmark.member.id,
      type: "member",
      name: bookmark.member.display_name ?? bookmark.member.username,
    },
    post: {
      id: bookmark.post.id,
      type: bookmark.post.actor_type,
      title: bookmark.post.title,
    },
    created_at: toISOStringSafe(bookmark.created_at),
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
