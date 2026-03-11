import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAdminRequests(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdminRequest.IRequest;
}): Promise<IPageIDiscussionBoardAdminRequest.ISummary> {
  // 1. Validate super administrator authorization
  const admin = await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow(
    {
      where: { id: props.admin.id, deleted_at: null },
      select: { grade: true },
    },
  );
  if (admin.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Parse cursor if provided
  let cursorSubmittedAt: Date | null = null;
  let cursorId: string | null = null;
  if (props.body.cursor) {
    const decoded = JSON.parse(
      Buffer.from(props.body.cursor, "base64").toString(),
    );
    cursorSubmittedAt = new Date(decoded.submitted_at);
    cursorId = decoded.id;
  }
  // 3. Build WHERE clause
  const whereInput: Prisma.discussion_board_admin_requestsWhereInput = {
    deleted_at: null,
    ...(props.body.status && {
      status: Array.isArray(props.body.status)
        ? { in: props.body.status }
        : props.body.status,
    }),
    ...(props.body.submitted_at_gte && {
      submitted_at: {
        gte: new Date(props.body.submitted_at_gte),
      },
    }),
    ...(props.body.submitted_at_lte && {
      submitted_at: {
        lte: new Date(props.body.submitted_at_lte),
      },
    }),
    ...(props.body.reviewed_at_gte && {
      reviewed_at: {
        gte: new Date(props.body.reviewed_at_gte),
      },
    }),
    ...(props.body.reviewed_at_lte && {
      reviewed_at: {
        lte: new Date(props.body.reviewed_at_lte),
      },
    }),
    ...(props.body.discussion_board_admin_id && {
      discussion_board_admin_id: props.body.discussion_board_admin_id,
    }),
    ...(cursorSubmittedAt &&
      cursorId && {
        AND: [
          {
            OR: [
              { submitted_at: { lt: cursorSubmittedAt } },
              {
                submitted_at: cursorSubmittedAt,
                id: { lt: cursorId },
              },
            ],
          },
        ],
      }),
  } satisfies Prisma.discussion_board_admin_requestsWhereInput;
  // 4. Determine limit and skip with validation
  const limit = typia.assert<number & tags.Minimum<1> & tags.Maximum<100>>(
    props.body.limit ?? 20,
  );
  const page = typia.assert<number & tags.Minimum<1>>(props.body.page ?? 1);
  const skip = (page - 1) * limit;
  // 5. Fetch paginated data with joins
  const records =
    await MyGlobal.prisma.discussion_board_admin_requests.findMany({
      where: whereInput,
      orderBy: { submitted_at: "desc" },
      skip,
      take: limit + 1,
      select: {
        id: true,
        reason: true,
        status: true,
        submitted_at: true,
        reviewed_at: true,
        discussion_board_member_id: true,
        discussion_board_admin_id: true,
        member: {
          select: {
            id: true,
            display_name: true,
            ban_status: true,
            created_at: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            display_name: true,
            bio: true,
            grade: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  // 6. Check if there's a next page
  const hasNext = records.length > limit;
  if (hasNext) {
    records.pop();
  }
  // 7. Generate next cursor
  let nextCursor: string | null = null;
  if (hasNext && records.length > 0) {
    const last = records[records.length - 1];
    nextCursor = Buffer.from(
      JSON.stringify({
        submitted_at: toISOStringSafe(last.submitted_at),
        id: last.id,
      }),
    ).toString("base64");
  }
  // 8. Fetch total count
  const total = await MyGlobal.prisma.discussion_board_admin_requests.count({
    where: whereInput,
  });
  // 9. Transform to ISummary
  const data = await ArrayUtil.asyncMap(
    records,
    async (record): Promise<IDiscussionBoardAdminRequest.ISummary> => {
      const summary: IDiscussionBoardAdminRequest.ISummary = {
        id: typia.assert<string & tags.Format<"uuid">>(record.id),
        member: {
          id: typia.assert<string & tags.Format<"uuid">>(record.member.id),
          display_name: record.member.display_name,
          ban_status: record.member.ban_status,
          created_at: typia.assert<string & tags.Format<"date-time">>(
            toISOStringSafe(record.member.created_at),
          ),
        } satisfies IDiscussionBoardMember.ISummary,
        reason: record.reason,
        status: typia.assert<"pending" | "approved" | "rejected">(
          record.status,
        ),
        submitted_at: typia.assert<string & tags.Format<"date-time">>(
          toISOStringSafe(record.submitted_at),
        ),
        reviewer: record.reviewer
          ? typia.assert<IDiscussionBoardAdmin.ISummary>({
              id: record.reviewer.id,
              display_name: record.reviewer.display_name,
              bio: record.reviewer.bio ?? null,
              grade: record.reviewer.grade,
              created_at: toISOStringSafe(record.reviewer.created_at),
              updated_at: toISOStringSafe(record.reviewer.updated_at),
              deleted_at: record.reviewer.deleted_at
                ? toISOStringSafe(record.reviewer.deleted_at)
                : null,
            })
          : null,
      };
      return summary;
    },
  );
  // 10. Return paginated response
  return typia.assert<IPageIDiscussionBoardAdminRequest.ISummary>({
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  });
}
