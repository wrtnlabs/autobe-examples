import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardFollowedTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFollowedTag";
import { IPageIDiscussionBoardFollowedTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardFollowedTag";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchDiscussionBoardMemberUsersUserIdFollowedTags(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardFollowedTag.IRequest;
}): Promise<IPageIDiscussionBoardFollowedTag.ISummary> {
  const { member, userId, body } = props;

  if (member.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only access your own followed tags",
      403,
    );
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_followed_tags.findMany({
      where: {
        discussion_board_member_id: userId,
        deleted_at: null,
        tag: {
          deleted_at: null,
          ...(body.tag_name !== undefined &&
            body.tag_name !== null && {
              name: { contains: body.tag_name },
            }),
          ...(body.tag_status !== undefined &&
            body.tag_status !== null && {
              status: body.tag_status,
            }),
        },
        ...(body.followed_after !== undefined &&
          body.followed_after !== null && {
            created_at: { gte: body.followed_after },
          }),
        ...(body.followed_before !== undefined &&
          body.followed_before !== null && {
            created_at: { lte: body.followed_before },
          }),
      },
      include: {
        tag: {
          include: {
            mv_discussion_board_tag_statistics: true,
          },
        },
      },
      orderBy:
        body.sort_by === "tag_name"
          ? { tag: { name: body.sort_order === "asc" ? "asc" : "desc" } }
          : { created_at: body.sort_order === "asc" ? "asc" : "desc" },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_followed_tags.count({
      where: {
        discussion_board_member_id: userId,
        deleted_at: null,
        tag: {
          deleted_at: null,
          ...(body.tag_name !== undefined &&
            body.tag_name !== null && {
              name: { contains: body.tag_name },
            }),
          ...(body.tag_status !== undefined &&
            body.tag_status !== null && {
              status: body.tag_status,
            }),
        },
        ...(body.followed_after !== undefined &&
          body.followed_after !== null && {
            created_at: { gte: body.followed_after },
          }),
        ...(body.followed_before !== undefined &&
          body.followed_before !== null && {
            created_at: { lte: body.followed_before },
          }),
      },
    }),
  ]);

  const data: IDiscussionBoardFollowedTag.ISummary[] = results.map(
    (followed) => {
      const stats = followed.tag.mv_discussion_board_tag_statistics;

      return {
        id: followed.id,
        discussion_board_member_id: followed.discussion_board_member_id,
        discussion_board_tag_id: followed.discussion_board_tag_id,
        tag_name: followed.tag.name,
        tag_description: followed.tag.description ?? null,
        tag_status: followed.tag.status,
        created_at: toISOStringSafe(followed.created_at),
        usage_count: stats ? stats.usage_count : undefined,
        follower_count: stats ? stats.follower_count : undefined,
      };
    },
  );

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
