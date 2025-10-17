import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IPageIDiscussionBoardLoginHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardLoginHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardLoginHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardLoginHistory";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchDiscussionBoardMemberUsersUserIdLoginHistory(props: {
  member: MemberPayload;
  userId: string & tags.Format<"uuid">;
  body: IDiscussionBoardMember.ILoginHistoryRequest;
}): Promise<IPageIDiscussionBoardLoginHistory> {
  const { member, userId, body } = props;

  if (member.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only access your own login history",
      403,
    );
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 50;
  const skip = (page - 1) * limit;

  const sortBy = body.sort_by ?? "created_at";
  const sortOrder = body.sort_order ?? "desc";

  const [records, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_login_history.findMany({
      where: {
        discussion_board_member_id: userId,
        ...(body.is_successful !== undefined &&
          body.is_successful !== null && {
            is_successful: body.is_successful,
          }),
        ...(body.failure_reason !== undefined &&
          body.failure_reason !== null && {
            failure_reason: { contains: body.failure_reason },
          }),
        ...(body.ip_address !== undefined &&
          body.ip_address !== null && {
            ip_address: { contains: body.ip_address },
          }),
        ...(body.device_type !== undefined &&
          body.device_type !== null && {
            device_type: { contains: body.device_type },
          }),
        ...(body.location !== undefined &&
          body.location !== null && {
            location: { contains: body.location },
          }),
        ...((body.created_after !== undefined && body.created_after !== null) ||
        (body.created_before !== undefined && body.created_before !== null)
          ? {
              created_at: {
                ...(body.created_after !== undefined &&
                  body.created_after !== null && {
                    gte: body.created_after,
                  }),
                ...(body.created_before !== undefined &&
                  body.created_before !== null && {
                    lte: body.created_before,
                  }),
              },
            }
          : {}),
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_login_history.count({
      where: {
        discussion_board_member_id: userId,
        ...(body.is_successful !== undefined &&
          body.is_successful !== null && {
            is_successful: body.is_successful,
          }),
        ...(body.failure_reason !== undefined &&
          body.failure_reason !== null && {
            failure_reason: { contains: body.failure_reason },
          }),
        ...(body.ip_address !== undefined &&
          body.ip_address !== null && {
            ip_address: { contains: body.ip_address },
          }),
        ...(body.device_type !== undefined &&
          body.device_type !== null && {
            device_type: { contains: body.device_type },
          }),
        ...(body.location !== undefined &&
          body.location !== null && {
            location: { contains: body.location },
          }),
        ...((body.created_after !== undefined && body.created_after !== null) ||
        (body.created_before !== undefined && body.created_before !== null)
          ? {
              created_at: {
                ...(body.created_after !== undefined &&
                  body.created_after !== null && {
                    gte: body.created_after,
                  }),
                ...(body.created_before !== undefined &&
                  body.created_before !== null && {
                    lte: body.created_before,
                  }),
              },
            }
          : {}),
      },
    }),
  ]);

  const data: IDiscussionBoardLoginHistory[] = records.map((record) => ({
    id: record.id,
    discussion_board_member_id: record.discussion_board_member_id ?? undefined,
    discussion_board_moderator_id:
      record.discussion_board_moderator_id ?? undefined,
    discussion_board_administrator_id:
      record.discussion_board_administrator_id ?? undefined,
    email_attempted: record.email_attempted,
    is_successful: record.is_successful,
    failure_reason: record.failure_reason ?? undefined,
    ip_address: record.ip_address,
    device_type: record.device_type,
    browser_info: record.browser_info,
    location: record.location ?? undefined,
    created_at: toISOStringSafe(record.created_at),
  }));

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages,
    },
    data,
  };
}
