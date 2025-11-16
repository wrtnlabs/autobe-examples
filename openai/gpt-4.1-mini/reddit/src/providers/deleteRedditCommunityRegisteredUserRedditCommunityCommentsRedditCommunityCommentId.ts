import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function deleteRedditCommunityRegisteredUserRedditCommunityCommentsRedditCommunityCommentId(props: {
  registeredUser: RegisteredUserPayload;
  redditCommunityCommentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const comment = await MyGlobal.prisma.reddit_community_comments.findUnique({
    where: { id: props.redditCommunityCommentId },
  });

  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }

  if (comment.reddit_community_registered_user_id !== props.registeredUser.id) {
    throw new HttpException("Forbidden", 403);
  }

  await MyGlobal.prisma.reddit_community_comments.delete({
    where: { id: props.redditCommunityCommentId },
  });
}
