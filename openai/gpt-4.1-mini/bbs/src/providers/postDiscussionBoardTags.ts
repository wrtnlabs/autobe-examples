import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardTagCollector } from "../collectors/DiscussionBoardTagCollector";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardTags(props: {
  body: IDiscussionBoardTag.ICreate;
}): Promise<IDiscussionBoardTag> {
  const name = (props.body as any).name;
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new HttpException("Tag name must not be empty", 400);
  }
  const existing = await MyGlobal.prisma.discussion_board_tags.findUnique({
    where: { name },
  });
  if (existing) {
    throw new HttpException("Tag name already exists", 400);
  }
  const createInput = await DiscussionBoardTagCollector.collect({
    body: props.body,
  });
  const created = await MyGlobal.prisma.discussion_board_tags.create({
    data: createInput,
  });
  return {
    id: created.id,
    name: created.name,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
