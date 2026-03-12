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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardTagTransformer } from "../transformers/DiscussionBoardTagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardMemberTags(props: {
  member: MemberPayload;
  body: IDiscussionBoardTag.ICreate;
}): Promise<IDiscussionBoardTag> {
  // Validate tag name is non-empty
  if (!props.body.name || props.body.name.trim() === "") {
    throw new HttpException("Tag name cannot be empty", 400);
  }
  // Check if tag with exact name already exists (case-sensitive)
  const existing = await MyGlobal.prisma.discussion_board_tags.findFirst({
    where: {
      name: props.body.name,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException("Tag with this name already exists", 409);
  }
  // Create new tag
  const created = await MyGlobal.prisma.discussion_board_tags.create({
    data: await DiscussionBoardTagCollector.collect({ body: props.body }),
    ...DiscussionBoardTagTransformer.select(),
  });
  return await DiscussionBoardTagTransformer.transform(created);
}
