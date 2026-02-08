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
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardRegisteredUserTagsAutocomplete(props: {
  registeredUser: RegistereduserPayload;
  body: IDiscussionBoardTag.IRequest;
}): Promise<IPageIDiscussionBoardTag.ISummary> {
  const body = props.body;
  const page =
    typeof (body as any).page === "number" && (body as any).page > 0
      ? (body as any).page
      : 1;
  const limit =
    typeof (body as any).limit === "number" && (body as any).limit > 0
      ? (body as any).limit
      : 10;
  const name =
    typeof (body as any).name === "string" ? (body as any).name : undefined;
  const whereInput: Prisma.discussion_board_tagsWhereInput = {
    deleted_at: null,
    ...(name ? { name: { contains: name } } : {}),
  };
  const data = await MyGlobal.prisma.discussion_board_tags.findMany({
    where: whereInput,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      name: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.discussion_board_tags.count({
    where: whereInput,
  });
  return {
    data: data.map((tag) => ({
      id: tag.id,
      name: tag.name,
      created_at: toISOStringSafe(tag.created_at),
      updated_at: toISOStringSafe(tag.updated_at),
      deleted_at:
        tag.deleted_at === null ? null : toISOStringSafe(tag.deleted_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
