import { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardBanAtSummaryTransformer } from "../transformers/DiscussionBoardBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardBans(props: {
  body: IDiscussionBoardBan.IRequest;
}): Promise<IPageIDiscussionBoardBan.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.email !== undefined && {
      user: {
        email: { contains: props.body.email, mode: "insensitive" as const },
      },
    }),
    ...(props.body.displayName !== undefined && {
      user: {
        display_name: {
          contains: props.body.displayName,
          mode: "insensitive" as const,
        },
      },
    }),
    ...(props.body.administratorId !== undefined && {
      discussion_board_administrator_id: props.body.administratorId,
    }),
  } satisfies Prisma.discussion_board_bansWhereInput;
  const data = await MyGlobal.prisma.discussion_board_bans.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...DiscussionBoardBanAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.discussion_board_bans.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      DiscussionBoardBanAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
