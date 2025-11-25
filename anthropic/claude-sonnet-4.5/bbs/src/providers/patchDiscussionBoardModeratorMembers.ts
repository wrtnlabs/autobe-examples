import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        {
          username: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
        {
          display_name: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
    ...(props.body.emailVerified !== undefined && {
      email_verified: props.body.emailVerified,
    }),
    ...(props.body.isSuspended !== undefined && {
      is_suspended: props.body.isSuspended,
    }),
    ...((props.body.createdAfter || props.body.createdBefore) && {
      created_at: {
        ...(props.body.createdAfter && {
          gte: new Date(props.body.createdAfter),
        }),
        ...(props.body.createdBefore && {
          lte: new Date(props.body.createdBefore),
        }),
      },
    }),
    ...(props.body.lastLoginAfter && {
      last_login_at: {
        gte: new Date(props.body.lastLoginAfter),
      },
    }),
  };

  const orderByField = props.body.orderBy ?? "created_at";
  const orderDirection = props.body.orderDirection ?? "desc";
  const orderBy = { [orderByField]: orderDirection };

  const [members, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_members.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.discussion_board_members.count({ where }),
  ]);

  return {
    data: members.map((member) => ({
      id: member.id as string & tags.Format<"uuid">,
      username: member.username,
      display_name:
        member.display_name === null ? undefined : member.display_name,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
