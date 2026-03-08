import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanRecord";
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

export async function patchDiscussionBoardAdminBanRecords(props: {
  admin: AdminPayload;
  body: IDiscussionBoardBanRecord.IRequest;
}): Promise<IPageIDiscussionBoardBanRecord.ISummary> {
  // Parse pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause with filters
  const whereInput: Prisma.discussion_board_ban_recordsWhereInput = {
    deleted_at: null,
    ...(props.body.member_id && {
      discussion_board_member_id: props.body.member_id,
    }),
    ...(props.body.discussion_board_admin_id && {
      discussion_board_admin_id: props.body.discussion_board_admin_id,
    }),
    ...(props.body.banned_at_from && {
      banned_at: {
        gte: new Date(props.body.banned_at_from),
      },
    }),
    ...(props.body.banned_at_to && {
      banned_at: {
        lte: new Date(props.body.banned_at_to),
      },
    }),
    ...(props.body.unbanned_at_filter === "active" && {
      unbanned_at: null,
    }),
    ...(props.body.unbanned_at_filter === "historical" && {
      unbanned_at: {
        not: null,
      },
    }),
    // Member search requires separate handling with OR condition
    ...(props.body.member_search && {
      discussionBoardMember: {
        OR: [
          {
            email: {
              contains: props.body.member_search,
              mode: "insensitive",
            },
          },
          {
            display_name: {
              contains: props.body.member_search,
              mode: "insensitive",
            },
          },
        ],
      },
    }),
    // Reason search
    ...(props.body.reason_search && {
      reason: {
        contains: props.body.reason_search,
        mode: "insensitive",
      },
    }),
  };
  // Build orderBy clause
  const sort_by = props.body.sort_by ?? "banned_at";
  const sort_order = props.body.sort_order ?? "desc";
  const orderByInput: Prisma.discussion_board_ban_recordsOrderByWithRelationInput =
    {
      [sort_by]: sort_order,
    };
  // Fetch paginated data
  const data = await MyGlobal.prisma.discussion_board_ban_records.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      reason: true,
      banned_at: true,
      unbanned_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      discussionBoardMember: {
        select: {
          id: true,
          display_name: true,
          bio: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      discussionBoardAdmin: {
        select: {
          id: true,
          email: true,
          display_name: true,
          grade: true,
          created_at: true,
        },
      },
    },
  });
  // Fetch total count
  const total = await MyGlobal.prisma.discussion_board_ban_records.count({
    where: whereInput,
  });
  // Transform to response DTO
  const records: IDiscussionBoardBanRecord.ISummary[] = data.map((record) => ({
    id: record.id,
    reason: record.reason,
    banned_at: toISOStringSafe(record.banned_at),
    unbanned_at: record.unbanned_at
      ? toISOStringSafe(record.unbanned_at)
      : null,
    discussionBoardMember: {
      id: record.discussionBoardMember.id,
      displayName: record.discussionBoardMember.display_name,
      bio: record.discussionBoardMember.bio,
      articleCount: 0,
      commentCount: 0,
      createdAt: toISOStringSafe(record.discussionBoardMember.created_at),
      updatedAt: toISOStringSafe(record.discussionBoardMember.updated_at),
      deletedAt: record.discussionBoardMember.deleted_at
        ? toISOStringSafe(record.discussionBoardMember.deleted_at)
        : null,
    },
    discussionBoardAdmin: {
      id: record.discussionBoardAdmin.id,
      email: record.discussionBoardAdmin.email,
      display_name: record.discussionBoardAdmin.display_name,
      grade: record.discussionBoardAdmin.grade,
      created_at: toISOStringSafe(record.discussionBoardAdmin.created_at),
    },
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records,
  };
}
