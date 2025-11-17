import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function postRedditCommunityRegisteredUserRedditCommunityPostsPostIdPostVotes(props: {
  registeredUser: RegistereduserPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostVote.ICreate;
}): Promise<IRedditCommunityPostVote> {
  const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: props.postId },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  try {
    const created = await MyGlobal.prisma.reddit_community_post_votes.create({
      data: {
        id: v4(),
        reddit_community_post_id: props.postId,
        reddit_community_registereduser_id: props.registeredUser.id,
        reddit_community_registereduser_session_id:
          props.registeredUser.session_id,
        vote_type: props.body.vote_type,
        created_at: toISOStringSafe(new Date()),
        deleted_at: null,
      },
    });

    return {
      id: created.id,
      reddit_community_post_id: created.reddit_community_post_id,
      reddit_community_registereduser_id:
        created.reddit_community_registereduser_id,
      reddit_community_registereduser_session_id:
        created.reddit_community_registereduser_session_id,
      vote_type: created.vote_type,
      created_at: toISOStringSafe(created.created_at),
      deleted_at:
        created.deleted_at !== null
          ? toISOStringSafe(created.deleted_at)
          : null,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        "Duplicate vote: a vote by this user on this post already exists",
        409,
      );
    }
    throw error;
  }
}
