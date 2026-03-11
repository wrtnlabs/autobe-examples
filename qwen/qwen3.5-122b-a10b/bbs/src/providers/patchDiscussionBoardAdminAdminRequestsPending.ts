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
import { DiscussionBoardAdminRequestAtSummaryTransformer } from "../transformers/DiscussionBoardAdminRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAdminRequestsPending(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdminRequest.IRequest;
}): Promise<IPageIDiscussionBoardAdminRequest.ISummary> {
  // Validate super administrator
  const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
    where: { id: props.admin.id },
    select: { grade: true, deleted_at: true },
  });
  if (!admin || admin.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  if (admin.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  // Build where clause - status is fixed to 'pending' for this endpoint
  const whereInput: Prisma.discussion_board_admin_requestsWhereInput = {
    status: "pending",
    deleted_at: null,
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
  };
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Cursor-based pagination
  let cursorInput: Prisma.discussion_board_admin_requestsWhereInput | undefined;
  if (props.body.cursor) {
    try {
      const cursorData = JSON.parse(
        Buffer.from(props.body.cursor, "base64").toString(),
      );
      cursorInput = {
        AND: [
          {
            submitted_at: {
              lt: new Date(cursorData.submitted_at),
            },
          },
          {
            id: {
              lt: cursorData.id,
            },
          },
        ],
      };
    } catch {
      cursorInput = undefined;
    }
  }
  const finalWhere = cursorInput
    ? { AND: [whereInput, cursorInput] }
    : whereInput;
  // Fetch data
  const data = await MyGlobal.prisma.discussion_board_admin_requests.findMany({
    where: finalWhere,
    skip: cursorInput ? undefined : skip,
    take: limit,
    orderBy: { submitted_at: "desc" },
    ...DiscussionBoardAdminRequestAtSummaryTransformer.select(),
  });
  // Count total
  const total = await MyGlobal.prisma.discussion_board_admin_requests.count({
    where: whereInput,
  });
  // Transform data
  const records = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardAdminRequestAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: records,
  } satisfies IPageIDiscussionBoardAdminRequest.ISummary;
}
