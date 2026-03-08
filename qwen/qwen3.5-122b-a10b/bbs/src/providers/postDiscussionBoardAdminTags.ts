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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardTagTransformer } from "../transformers/DiscussionBoardTagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminTags(props: {
  admin: AdminPayload;
  body: IDiscussionBoardTag.ICreate;
}): Promise<IDiscussionBoardTag> {
  const trimmedName = props.body.name.trim();
  if (trimmedName.length === 0) {
    throw new HttpException("Tag name cannot be empty", 400);
  }
  const existing = await MyGlobal.prisma.discussion_board_tags.findFirst({
    where: {
      name: trimmedName,
      deleted_at: null,
    },
  });
  if (existing !== null) {
    throw new HttpException("Tag name already exists", 409);
  }
  const created = await MyGlobal.prisma.discussion_board_tags.create({
    data: await DiscussionBoardTagCollector.collect({
      body: { ...props.body, name: trimmedName },
    }),
    ...DiscussionBoardTagTransformer.select(),
  });
  return await DiscussionBoardTagTransformer.transform(created);
}
