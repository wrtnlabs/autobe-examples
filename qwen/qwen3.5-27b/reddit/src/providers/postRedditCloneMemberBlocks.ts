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
import { RedditCloneBlockCollector } from "../collectors/RedditCloneBlockCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneBlockTransformer } from "../transformers/RedditCloneBlockTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberBlocks(props: {
  member: MemberPayload;
  body: IRedditCloneBlock.ICreate;
}): Promise<IRedditCloneBlock> {
  // Validate that user is not blocking themselves
  if (props.member.id === props.body.blocked_user_id) {
    throw new HttpException("Cannot block yourself", 400);
  }
  // Validate that the blocked user exists
  await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
    where: {
      id: props.body.blocked_user_id,
      deleted_at: null,
    },
  });
  // Check if block already exists
  const existingBlock = await MyGlobal.prisma.reddit_clone_blocks.findFirst({
    where: {
      blocker_id: props.member.id,
      blocked_user_id: props.body.blocked_user_id,
      deleted_at: null,
    },
    ...RedditCloneBlockTransformer.select(),
  });
  if (existingBlock) {
    // Return existing block with 409 Conflict
    const transformed =
      await RedditCloneBlockTransformer.transform(existingBlock);
    throw new HttpException("Block already exists", 409);
  }
  // Create new block relationship
  const created = await MyGlobal.prisma.reddit_clone_blocks.create({
    data: await RedditCloneBlockCollector.collect({
      body: props.body,
      redditCloneMembers: {
        id: props.member.id,
      },
    }),
    ...RedditCloneBlockTransformer.select(),
  });
  return await RedditCloneBlockTransformer.transform(created);
}
