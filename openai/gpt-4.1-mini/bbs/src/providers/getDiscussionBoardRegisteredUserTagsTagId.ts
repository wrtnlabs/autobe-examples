import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { DiscussionBoardTagTransformer } from "../transformers/DiscussionBoardTagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardRegisteredUserTagsTagId(props: {
  registeredUser: RegistereduserPayload;
  tagId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardTag> {
  const tagRecord =
    await MyGlobal.prisma.discussion_board_tags.findUniqueOrThrow({
      where: { id: props.tagId },
      ...DiscussionBoardTagTransformer.select(),
    });
  return await DiscussionBoardTagTransformer.transform(tagRecord);
}
