import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function deleteDiscussionBoardModeratorTagsTagSlug(props: {
  moderator: ModeratorPayload;
  tagSlug: string;
}): Promise<void> {
  const { tagSlug } = props;

  const tag = await MyGlobal.prisma.discussion_board_tags.findFirst({
    where: { slug: tagSlug },
  });

  if (!tag) {
    throw new HttpException("Tag not found", 404);
  }

  await MyGlobal.prisma.discussion_board_tags.delete({
    where: { id: tag.id },
  });
}
