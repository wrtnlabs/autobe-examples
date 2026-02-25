import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneContentPostVoteTransformer } from "../transformers/RedditCloneContentPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditClonePostsPostIdVotes(props: {
  postId: string;
  body: IRedditCloneContentPostVote.ICreate;
}): Promise<IRedditCloneContentPostVote> {
  const voteValue =
    props.body.voteType === "upvote"
      ? 1
      : props.body.voteType === "downvote"
        ? -1
        : 0;
  // TODO: Get current user context from authorized actor
  const memberId = "current_user_id" as string & tags.Format<"uuid">; // Placeholder
  const existingVote =
    await MyGlobal.prisma.reddit_clone_content_post_votes.findFirst({
      where: {
        member_id: memberId,
        post_id: props.postId,
      },
    });
  const createdOrUpdated =
    await MyGlobal.prisma.reddit_clone_content_post_votes.upsert({
      where: {
        member_id_post_id: {
          member_id: memberId,
          post_id: props.postId,
        },
      },
      create: {
        id: v4() as string & tags.Format<"uuid">,
        vote_value: voteValue,
        created_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
        updated_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
        member_id: memberId,
        post_id: props.postId,
      },
      update: {
        vote_value: voteValue,
        updated_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
      },
    });
  // Create a complete entity structure with relations for the transformer
  const completeEntity = {
    ...createdOrUpdated,
    member: {
      id: memberId,
      email: "user@example.com",
      username: "user",
      password_hash: "",
      display_name: null,
      bio: null,
      avatar_url: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    post: {
      id: props.postId,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      content: null,
      vote_score: 0,
      author_id: memberId,
      community_id: "",
      type: "",
      title: "",
      image_url: null,
      comment_count: 0,
    },
  };
  const transformed =
    await RedditCloneContentPostVoteTransformer.transform(completeEntity);
  return transformed;
}
