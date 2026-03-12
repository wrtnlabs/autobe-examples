import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardBanRecordAtSummaryTransformer } from "../transformers/DiscussionBoardBanRecordAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorBanRecords(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardBanRecord.IRequest;
}): Promise<IPageIDiscussionBoardBanRecord.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.actor_type && {
      actor_type: props.body.actor_type,
    }),
    ...(props.body.status === "active" && {
      unbanned_at: null,
    }),
    ...(props.body.status === "lifted" && {
      unbanned_at: {
        not: null,
      },
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
    ...(props.body.search && {
      ban_reason: {
        mode: "insensitive",
        contains: props.body.search,
      },
    }),
  } satisfies Prisma.discussion_board_ban_recordsWhereInput;
  const orderByInput = (
    props.body.sort === "banned_at_asc"
      ? { banned_at: "asc" as const }
      : { banned_at: "desc" as const }
  ) satisfies Prisma.discussion_board_ban_recordsOrderByWithRelationInput;
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
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardBanRecordAtSummaryTransformer.transform,
    ),
  };
}
