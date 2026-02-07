import { IDiscussionBoardBansAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansAppeal";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardBansAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBansAppeal";
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

export async function patchDiscussionBoardAdminAdminsBansAppeals(props: {
  admin: AdminPayload;
  body: IDiscussionBoardBansAppeal.IRequest;
}): Promise<IPageIDiscussionBoardBansAppeal.ISummary> {
  const page = (props.body as any).page ?? 1;
  const limit = (props.body as any).limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...((props.body as any).banReason && {
      banRecord: {
        reason: {
          contains: (props.body as any).banReason,
          mode: "insensitive" as const,
        },
      },
    }),
    ...((props.body as any).userEmail && {
      user: {
        email: {
          contains: (props.body as any).userEmail,
          mode: "insensitive" as const,
        },
      },
    }),
    ...((props.body as any).userName && {
      user: {
        display_name: {
          contains: (props.body as any).userName,
          mode: "insensitive" as const,
        },
      },
    }),
    ...((props.body as any).status && {
      status: (props.body as any).status,
    }),
    ...((props.body as any).appealStartDate && {
      appeal_created_at: { gte: new Date((props.body as any).appealStartDate) },
    }),
    ...((props.body as any).appealEndDate && {
      appeal_created_at: { lte: new Date((props.body as any).appealEndDate) },
    }),
    ...((props.body as any).reviewed === true && {
      reviewed_by_id: { not: null },
    }),
    ...((props.body as any).reviewed === false && {
      reviewed_by_id: null,
    }),
  } satisfies Prisma.discussion_board_bans_appealsWhereInput;
  const orderByInput = {
    appeal_created_at: "desc",
  } satisfies Prisma.discussion_board_bans_appealsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.discussion_board_bans_appeals.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
  });
  const total = await MyGlobal.prisma.discussion_board_bans_appeals.count({
    where: whereInput,
  });
  return {
    data: data.map((record) => ({
      id: record.id,
      ban_record_id: record.ban_record_id,
      user_id: record.user_id,
      reviewed_by_id:
        record.reviewed_by_id === null ? undefined : record.reviewed_by_id,
      appeal_reason: record.appeal_reason,
      status: record.status,
      review_notes:
        record.review_notes === null ? undefined : record.review_notes,
      appeal_created_at: toISOStringSafe(record.appeal_created_at),
      reviewed_at:
        record.reviewed_at === null
          ? undefined
          : toISOStringSafe(record.reviewed_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
