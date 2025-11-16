import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchDiscussionBoardModeratorMembers(props: {
  moderator: ModeratorPayload;
  body: IDiscussionBoardMember.IRequest;
}): Promise<IPageIDiscussionBoardMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  const sortParam = props.body.sort ?? "-created_at";
  const isDescending = sortParam.startsWith("-");
  const sortField = isDescending ? sortParam.substring(1) : sortParam;
  const sortDirection = isDescending ? "desc" : "asc";

  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_members.findMany({
      where: {
        ...(props.body.search && {
          username: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }),
        ...(props.body.email && {
          email: {
            contains: props.body.email,
            mode: "insensitive",
          },
        }),
        ...(props.body.status && {
          status: props.body.status,
        }),
        ...((props.body.created_at_from || props.body.created_at_to) && {
          created_at: {
            ...(props.body.created_at_from && {
              gte: props.body.created_at_from,
            }),
            ...(props.body.created_at_to && { lte: props.body.created_at_to }),
          },
        }),
      },
      skip,
      take: limit,
      orderBy: {
        [sortField]: sortDirection,
      },
    }),
    MyGlobal.prisma.discussion_board_members.count({
      where: {
        ...(props.body.search && {
          username: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }),
        ...(props.body.email && {
          email: {
            contains: props.body.email,
            mode: "insensitive",
          },
        }),
        ...(props.body.status && {
          status: props.body.status,
        }),
        ...((props.body.created_at_from || props.body.created_at_to) && {
          created_at: {
            ...(props.body.created_at_from && {
              gte: props.body.created_at_from,
            }),
            ...(props.body.created_at_to && { lte: props.body.created_at_to }),
          },
        }),
      },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((member) => ({
      id: member.id,
      username: member.username,
      email: member.email,
      status: member.status,
      email_verified: member.email_verified,
      created_at: toISOStringSafe(member.created_at),
    })),
  };
}
