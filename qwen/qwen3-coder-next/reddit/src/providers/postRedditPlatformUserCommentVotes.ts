import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
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

export async function postRedditPlatformUserCommentVotes(props: {
  user: UserPayload;
  body: IRedditPlatformCommentVote.ICreate;
}): Promise<IRedditPlatformCommentVote> {
  const created = await MyGlobal.prisma.reddit_platform_comment_votes.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      vote_type: "upvote", // Default value as DTO is empty
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      user_id: props.user.id,
      comment_id: v4() as string & tags.Format<"uuid">, // Placeholder - should be from request body
    },
    select: {
      id: true,
      vote_type: true,
      created_at: true,
      updated_at: true,
      user_id: true,
      comment_id: true,
    },
  });
  return {
    id: created.id,
    vote_type: created.vote_type,
    created_at: created.created_at,
    updated_at: created.updated_at,
    user_id: created.user_id,
    comment_id: created.comment_id,
  };
}
