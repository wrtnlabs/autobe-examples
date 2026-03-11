import { IDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { DiscussionBoardGuestSessionAtSummaryTransformer } from "../transformers/DiscussionBoardGuestSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardGuestSessions(props: {
  guest: GuestPayload;
  body: IDiscussionBoardGuestSession.IRequest;
}): Promise<IPageIDiscussionBoardGuestSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause based on filter criteria
  const whereInput = {
    ...(props.body.ip && { ip: props.body.ip }),
    ...(props.body.href && { href: props.body.href }),
    ...(props.body.referrer && { referrer: props.body.referrer }),
    ...(props.body.created_at && {
      created_at: {
        gte: new Date(props.body.created_at),
      },
    }),
    ...(props.body.expired_at && {
      expired_at: {
        gte: new Date(props.body.expired_at),
      },
    }),
  } satisfies Prisma.discussion_board_guest_sessionsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_guest_sessions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardGuestSessionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_guest_sessions.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardGuestSessionAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
