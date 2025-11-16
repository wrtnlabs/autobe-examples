import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function postRedditCommunityRegisteredUserRedditCommunityCommentVotes(props: {
  registeredUser: RegisteredUserPayload;
  body: IRedditCommunityCommentVote.ICreate;
}): Promise<IRedditCommunityCommentVote> {
  const created = await MyGlobal.prisma.reddit_community_comment_votes.create({
    data: {
      id: v4(),
      reddit_community_comment_id: props.body.reddit_community_comment_id,
      reddit_community_registered_user_id: props.registeredUser.id,
      vote_type: String(props.body.vote),
      created_at: new Date(),
    },
  });

  return {
    id: created.id,
    reddit_community_comment_id: created.reddit_community_comment_id,
    reddit_community_registered_user_id:
      created.reddit_community_registered_user_id,
    vote: Number(created.vote_type) satisfies number &
      tags.Type<"int32"> as number,
    created_at: toISOStringSafe(created.created_at),
  };
}
