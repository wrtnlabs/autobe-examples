import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import { IDiscussionBoardAdminRequestHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestHistory";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdminRequestHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequestHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAdminRequestHistoryAtSummaryTransformer } from "../transformers/DiscussionBoardAdminRequestHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAdminRequestHistories(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdminRequestHistory.IRequest;
}): Promise<IPageIDiscussionBoardAdminRequestHistory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.discussion_board_admin_request_id !== undefined && {
      discussion_board_admin_request_id:
        props.body.discussion_board_admin_request_id,
    }),
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
    ...(props.body.reviewer_id !== undefined && {
      reviewer_id: props.body.reviewer_id,
    }),
    ...((props.body.created_at_from !== undefined ||
      props.body.created_at_to !== undefined) && {
      created_at: {
        ...(props.body.created_at_from !== undefined && {
          gte: new Date(props.body.created_at_from),
        }),
        ...(props.body.created_at_to !== undefined && {
          lte: new Date(props.body.created_at_to),
        }),
      },
    }),
  } satisfies Prisma.discussion_board_admin_request_historiesWhereInput;
  const data =
    await MyGlobal.prisma.discussion_board_admin_request_histories.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardAdminRequestHistoryAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.discussion_board_admin_request_histories.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardAdminRequestHistoryAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
