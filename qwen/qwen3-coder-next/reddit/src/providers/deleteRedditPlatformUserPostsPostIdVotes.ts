import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditPlatformUserPostsPostIdVotes(props: {
  user: UserPayload;
  postId: string;
}): Promise<void> {
  // Query and delete the user's vote for this post
  const vote = await MyGlobal.prisma.reddit_platform_post_votes.findFirst({
    where: {
      post_id: props.postId,
      user_id: props.user.id,
    },
  });
  // If vote doesn't exist, nothing to do
  if (!vote) {
    return;
  }
  // Delete the vote record
  await MyGlobal.prisma.reddit_platform_post_votes.delete({
    where: { id: vote.id },
  });
}
