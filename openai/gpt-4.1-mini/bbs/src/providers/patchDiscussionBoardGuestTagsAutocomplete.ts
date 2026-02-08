import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardGuestTagsAutocomplete(props: {
  guest: GuestPayload;
  body: IDiscussionBoardTag.IRequest;
}): Promise<IPageIDiscussionBoardTag.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
  } satisfies Prisma.discussion_board_tagsWhereInput;
  const data = await MyGlobal.prisma.discussion_board_tags.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.discussion_board_tags.count({
    where: whereInput,
  });
  return {
    data: data.map(() => ({})),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
