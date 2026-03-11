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
import { DiscussionBoardBanRecordAtSummaryTransformer } from "../transformers/DiscussionBoardBanRecordAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminBanRecords(props: {
  admin: AdminPayload;
  body: IDiscussionBoardBanRecord.IRequest;
}): Promise<IPageIDiscussionBoardBanRecord.ISummary> {
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereInput = {
    deleted_at: null,
    ...(props.body.memberId && {
      discussion_board_member_id: props.body.memberId,
    }),
    ...(props.body.adminId && {
      discussion_board_admin_id: props.body.adminId,
    }),
    ...(props.body.dateRange && {
      banned_at: {
        ...(props.body.dateRange.from && {
          gte: new Date(props.body.dateRange.from),
        }),
        ...(props.body.dateRange.to && {
          lte: new Date(props.body.dateRange.to),
        }),
      },
    }),
    ...(props.body.isActive !== undefined && {
      unbanned_at: props.body.isActive ? null : { not: null },
    }),
    ...(props.body.search && {
      OR: [
        {
          reason: {
            contains: props.body.search,
          },
        },
        {
          discussionBoardMember: {
            display_name: {
              contains: props.body.search,
            },
          },
        },
        {
          discussionBoardAdmin: {
            display_name: {
              contains: props.body.search,
            },
          },
        },
      ],
    }),
  } satisfies Prisma.discussion_board_ban_recordsWhereInput;
  // Build ORDER BY conditions
  const orderByInput = (
    props.body.sort?.field
      ? {
          [props.body.sort.field]: props.body.sort.direction ?? "desc",
        }
      : {
          banned_at: "desc",
        }
  ) satisfies Prisma.discussion_board_ban_recordsOrderByWithRelationInput;
  // Execute paginated query
  const records = await MyGlobal.prisma.discussion_board_ban_records.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...DiscussionBoardBanRecordAtSummaryTransformer.select(),
  });
  // Execute count query
  const total = await MyGlobal.prisma.discussion_board_ban_records.count({
    where: whereInput,
  });
  // Transform records
  const data = await ArrayUtil.asyncMap(
    records,
    DiscussionBoardBanRecordAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}
