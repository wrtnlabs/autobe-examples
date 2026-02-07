import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminTagsTagId(props: {
  superAdmin: SuperadminPayload;
  tagId: string;
}): Promise<void> {
  const existing = await MyGlobal.prisma.discussion_board_tags.findFirst({
    where: { id: props.tagId },
  });
  if (existing === null) {
    throw new HttpException("Tag not found", 404);
  }
  await MyGlobal.prisma.discussion_board_tags.delete({
    where: { id: props.tagId },
  });
}
