import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardTagTransformer } from "../transformers/DiscussionBoardTagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardTagsTagId(props: {
  tagId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardTag> {
  const tag = await MyGlobal.prisma.discussion_board_tags.findUniqueOrThrow({
    where: { id: props.tagId, deleted_at: null },
    ...DiscussionBoardTagTransformer.select(),
  });
  return await DiscussionBoardTagTransformer.transform(tag);
}
