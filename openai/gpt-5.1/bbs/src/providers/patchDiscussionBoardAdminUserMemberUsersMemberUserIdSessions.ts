import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuserSession";
import { IPageIDiscussionBoardMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMemberuserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function patchDiscussionBoardAdminUserMemberUsersMemberUserIdSessions(props: {
  adminUser: AdminuserPayload;
  memberUserId: string & tags.Format<"uuid">;
  body: IDiscussionBoardMemberuserSession.IRequest;
}): Promise<IPageIDiscussionBoardMemberuserSession.ISummary> {
  // Ensure the target member user exists before listing sessions.
  const memberUser =
    await MyGlobal.prisma.discussion_board_memberusers.findUnique({
      where: { id: props.memberUserId },
    });

  if (memberUser === null) {
    throw new HttpException("Member user not found", 404);
  }

  // Derive pagination parameters with sensible defaults.
  const requestedPage = props.body.page !== undefined ? props.body.page : 1;
  const requestedLimit = props.body.limit !== undefined ? props.body.limit : 20;

  const page = requestedPage < 1 ? 1 : requestedPage;
  const limit = requestedLimit < 0 ? 0 : requestedLimit;

  const skip = limit === 0 ? 0 : (page - 1) * limit;

  // Build the where condition for sessions.
  const baseWhere = {
    discussion_board_memberuser_id: props.memberUserId,
  };

  const dateRangeWhere = (() => {
    const createdFrom = props.body.created_from;
    const createdTo = props.body.created_to;

    if (
      createdFrom === undefined &&
      createdFrom === null &&
      createdTo === undefined &&
      createdTo === null
    ) {
      return {};
    }

    const createdAtCondition: Record<
      string,
      string & tags.Format<"date-time">
    > = {};

    if (createdFrom !== undefined && createdFrom !== null) {
      createdAtCondition.gte = createdFrom;
    }

    if (createdTo !== undefined && createdTo !== null) {
      createdAtCondition.lte = createdTo;
    }

    return Object.keys(createdAtCondition).length === 0
      ? {}
      : { created_at: createdAtCondition };
  })();

  const where = {
    ...baseWhere,
    ...dateRangeWhere,
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_memberuser_sessions.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.discussion_board_memberuser_sessions.count({ where }),
  ]);

  const memberSummary: IDiscussionBoardMemberuser.ISummary = {
    id: memberUser.id,
    display_name: memberUser.display_name,
    account_status: memberUser.account_status,
    created_at: toISOStringSafe(memberUser.created_at),
  };

  const data: IDiscussionBoardMemberuserSession.ISummary[] = rows.map((row) => {
    const summary: IDiscussionBoardMemberuserSession.ISummary = {
      id: row.id,
      created_at: toISOStringSafe(row.created_at),
      // Model does not provide last_active_at, so expose as null.
      last_active_at: null,
      ip: row.ip ?? null,
      href: row.href ?? null,
      referrer: row.referrer ?? null,
      expired_at:
        row.expired_at !== null && row.expired_at !== undefined
          ? toISOStringSafe(row.expired_at)
          : null,
      // Derive active flag from expired_at when explicit column is missing.
      is_active: row.expired_at === null,
      memberUser: memberSummary,
    };

    return summary;
  });

  const pagination: IPage.IPagination = {
    current: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
      page - 1,
    ),
    limit: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(limit),
    records: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(total),
    pages: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
      limit === 0 ? 0 : Math.ceil(total / limit),
    ),
  };

  return {
    pagination,
    data,
  };
}
