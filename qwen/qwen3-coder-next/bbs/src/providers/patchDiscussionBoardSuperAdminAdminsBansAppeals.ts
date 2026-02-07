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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminAdminsBansAppeals(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardBansAppeal.IRequest;
}): Promise<IPageIDiscussionBoardBansAppeal.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.discussion_board_bans_appealsWhereInput = {};
  const data = await MyGlobal.prisma.discussion_board_bans_appeals.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { appeal_created_at: "desc" },
    select: {
      id: true,
      ban_record_id: true,
      user_id: true,
      reviewed_by_id: true,
      appeal_reason: true,
      status: true,
      review_notes: true,
      appeal_created_at: true,
      reviewed_at: true,
      user: {
        select: {
          id: true,
          email: true,
          display_name: true,
        },
      },
      banRecord: {
        select: {
          id: true,
          reason: true,
          start_time: true,
          end_time: true,
          admin: {
            select: {
              id: true,
              display_name: true,
            },
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.discussion_board_bans_appeals.count({
    where: whereInput,
  });
  return {
    data: data.map((record) => ({
      id: record.id,
      ban_record_id: record.ban_record_id,
      user_id: record.user_id,
      reviewed_by_id: record.reviewed_by_id,
      appeal_reason: record.appeal_reason,
      status: record.status,
      review_notes: record.review_notes ?? null,
      appeal_created_at: toISOStringSafe(record.appeal_created_at),
      reviewed_at: record.reviewed_at
        ? toISOStringSafe(record.reviewed_at)
        : null,
      user: {
        id: record.user.id,
        email: record.user.email,
        display_name: record.user.display_name,
      },
      banRecord: {
        id: record.banRecord.id,
        reason: record.banRecord.reason,
        start_time: toISOStringSafe(record.banRecord.start_time),
        end_time: record.banRecord.end_time
          ? toISOStringSafe(record.banRecord.end_time)
          : null,
        admin: {
          id: record.banRecord.admin.id,
          display_name: record.banRecord.admin.display_name,
        },
      },
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
