import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorComments(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardComment.IRequest;
}): Promise<IPageIDiscussionBoardComment.ISummary> {
  const page = props.body.page === undefined ? 1 : Math.max(props.body.page, 1);
  const limit =
    props.body.limit === undefined
      ? 10
      : Math.min(Math.max(props.body.limit, 1), 100);
  const skip = (page - 1) * limit;
  const where: Prisma.discussion_board_commentsWhereInput = {};
  if (props.body.discussionBoardArticleId !== undefined) {
    where.discussion_board_article_id = props.body.discussionBoardArticleId;
  }
  if (props.body.discussionBoardRegisteredUserId !== undefined) {
    where.discussion_board_registered_user_id =
      props.body.discussionBoardRegisteredUserId;
  }
  if (props.body.contentKeywords !== undefined) {
    where.content = { contains: props.body.contentKeywords };
  }
  // Count total comments
  const total = await MyGlobal.prisma.discussion_board_comments.count({
    where,
  });
  // Fetch comment items without include relation because Prisma include does not support discussion_board_registered_user property
  const comments = await MyGlobal.prisma.discussion_board_comments.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "asc" },
  });
  // Extract all registered_user_ids to fetch users separately
  const userIds = Array.from(
    new Set(comments.map((c) => c.discussion_board_registered_user_id)),
  );
  // Fetch all related discussion_board_registered_users
  const registeredUsers =
    await MyGlobal.prisma.discussion_board_registered_users.findMany({
      where: { id: { in: userIds } },
    });
  // Map users by id for quick lookup
  const userMap = new Map<string, (typeof registeredUsers)[0]>();
  for (const user of registeredUsers) {
    userMap.set(user.id, user);
  }
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: comments.map((c) => {
      const user = userMap.get(c.discussion_board_registered_user_id)!;
      return {
        id: c.id as string & tags.Format<"uuid">,
        content: c.content,
        createdAt: toISOStringSafe(c.created_at) as string &
          tags.Format<"date-time">,
        updatedAt: toISOStringSafe(c.updated_at) as string &
          tags.Format<"date-time">,
        deletedAt:
          c.deleted_at === null
            ? null
            : (toISOStringSafe(c.deleted_at) as string &
                tags.Format<"date-time">),
        author: {
          id: user.id as string & tags.Format<"uuid">,
          email: user.email,
          displayName: user.display_name,
          bio: user.bio ?? null,
          isBanned: user.is_banned,
          createdAt: toISOStringSafe(user.created_at) as string &
            tags.Format<"date-time">,
          updatedAt: toISOStringSafe(user.updated_at) as string &
            tags.Format<"date-time">,
          deletedAt:
            user.deleted_at === null
              ? null
              : (toISOStringSafe(user.deleted_at) as string &
                  tags.Format<"date-time">),
        },
      };
    }),
  };
}
