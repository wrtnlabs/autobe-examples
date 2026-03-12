import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCloneMemberBlocksBlockId(props: {
  member: MemberPayload;
  blockId: string & tags.Format<"uuid">;
}): Promise<void> {
  const block = await MyGlobal.prisma.reddit_clone_blocks.findUniqueOrThrow({
    where: { id: props.blockId },
    select: { id: true, blocker_id: true },
  });
  if (block.blocker_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.reddit_clone_blocks.update({
    where: { id: props.blockId },
    data: { deleted_at: new Date() },
  });
}
