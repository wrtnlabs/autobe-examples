import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function postRedditCommunityRegisteredUserRedditCommunityPostsPostIdCommentsCommentIdCommentVotes(props: {
  registeredUser: RegistereduserPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommentVote.ICreate;
}): Promise<IRedditCommunityCommentVote> {
  const id = v4();

  const createdAt = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.reddit_community_comment_votes.create({
    data: {
      id: id as string & tags.Format<"uuid">,
      reddit_community_comment_id: props.commentId,
      reddit_community_registereduser_id: props.registeredUser.id,
      reddit_community_registereduser_session_id:
        props.registeredUser.session_id,
      vote_type: props.body.vote_type,
      created_at: createdAt as string & tags.Format<"date-time">,
    },
  });

  return {
    id: created.id,
    reddit_community_comment_id: created.reddit_community_comment_id,
    reddit_community_registereduser_id:
      created.reddit_community_registereduser_id,
    reddit_community_registereduser_session_id:
      created.reddit_community_registereduser_session_id,
    vote_type: created.vote_type,
    created_at: toISOStringSafe(created.created_at),
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
