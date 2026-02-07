import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditPlatformCommentVoteCollector {
  export async function collect(props: {
    body: IRedditPlatformCommentVote.ICreate;
    redditPlatformComments: IEntity; // from path parameter commentId
    redditPlatformUsers: IEntity; // from authorized actor
    redditPlatformUserSessions: IEntity; // from authorized session
  }) {
    return {
      id: v4(),
      vote_type: "upvote", // Default value since DTO is empty
      created_at: new Date(),
      updated_at: new Date(),
      user: { connect: { id: props.redditPlatformUsers.id } },
      comment: { connect: { id: props.redditPlatformComments.id } },
    } satisfies Prisma.reddit_platform_comment_votesCreateInput;
  }
}
