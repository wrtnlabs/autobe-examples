import { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
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
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.ban_status && { ban_status: props.body.ban_status }),
    ...(props.body.ban_duration_days !== undefined && {
      ban_duration_days: props.body.ban_duration_days,
    }),
  } satisfies Prisma.discussion_board_ban_recordsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_ban_records.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
    }),
    MyGlobal.prisma.discussion_board_ban_records.count({
      where: whereInput,
    }),
  ]);
  const pagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  } satisfies IPage.IPagination;
  const transformedData = data.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
    ban_reason: record.ban_reason,
    ban_duration_days: record.ban_duration_days as
      | (number & tags.Type<"int32">)
      | null,
    ban_status: record.ban_status,
    expires_at: record.expires_at ? toISOStringSafe(record.expires_at) : null,
  }));
  return {
    pagination,
    data: transformedData,
  };
}
