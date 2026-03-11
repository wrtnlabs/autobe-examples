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

export async function patchDiscussionBoardAdminBanRecordsActive(props: {
  admin: AdminPayload;
  body: IDiscussionBoardBanRecord.IRequest;
}): Promise<IPageIDiscussionBoardBanRecord.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_ban_recordsWhereInput = {
    deleted_at: null,
    unbanned_at: null,
    ...(props.body.memberId !== undefined && {
      discussion_board_member_id: props.body.memberId,
    }),
    ...(props.body.adminId !== undefined && {
      discussion_board_admin_id: props.body.adminId,
    }),
    ...(props.body.dateRange !== undefined && {
      banned_at: {
        ...(props.body.dateRange.from !== undefined && {
          gte: new Date(props.body.dateRange.from),
        }),
        ...(props.body.dateRange.to !== undefined && {
          lte: new Date(props.body.dateRange.to),
        }),
      },
    }),
    ...(props.body.search !== undefined && {
      OR: [
        { reason: { contains: props.body.search } },
        {
          discussionBoardMember: {
            display_name: { contains: props.body.search },
          },
        },
        {
          discussionBoardAdmin: {
            display_name: { contains: props.body.search },
          },
        },
      ],
    }),
  } satisfies Prisma.discussion_board_ban_recordsWhereInput;
  const orderByInput: Prisma.discussion_board_ban_recordsOrderByWithRelationInput =
    props.body.sort?.field !== undefined
      ? {
          [props.body.sort.field]: props.body.sort.direction ?? "desc",
        }
      : { banned_at: "desc" as const };
  const data = await MyGlobal.prisma.discussion_board_ban_records.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...DiscussionBoardBanRecordAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_ban_records.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardBanRecordAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardBanRecord.ISummary;
}
