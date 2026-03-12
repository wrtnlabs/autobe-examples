import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneBlock } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBlock";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneBlockTransformer } from "../transformers/RedditCloneBlockTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneMemberBlocksBlockId(props: {
  member: MemberPayload;
  blockId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneBlock> {
  // Query the block record with blocker and blockedUser relations
  const block = await MyGlobal.prisma.reddit_clone_blocks.findUniqueOrThrow({
    where: {
      id: props.blockId,
      deleted_at: null,
    },
    ...RedditCloneBlockTransformer.select(),
  });
  // Authorization check: user must be either the blocker or the blocked user
  if (
    block.blocker.id !== props.member.id &&
    block.blockedUser.id !== props.member.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform and return the block entity
  return await RedditCloneBlockTransformer.transform(block);
}
