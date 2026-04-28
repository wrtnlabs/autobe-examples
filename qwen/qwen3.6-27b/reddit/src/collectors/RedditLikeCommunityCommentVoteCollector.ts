import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommentVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditLikeCommunityCommentVoteCollector {
  export async function collect(props: {
    body: IRedditLikeCommunityCommentVote.ICreate;
    redditLikeCommunityComments: IEntity;
    redditLikeCommunityMembers: IEntity;
  }) {
    return {
      id: v4(),
      direction: props.body.direction,
      created_at: new Date(),
      updated_at: new Date(),
      member: { connect: { id: props.redditLikeCommunityMembers.id } },
      comment: { connect: { id: props.redditLikeCommunityComments.id } },
    } satisfies Prisma.reddit_like_community_comment_votesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditLikeCommunityCommentVoteCollector {
//         export async function collect(props: {
//           body: IRedditLikeCommunityCommentVote.ICreate;
//           redditLikeCommunityComments: IEntity; // from path parameter commentId
// redditLikeCommunityMembers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       direction: ...,
//       created_at: ...,
//       updated_at: ...,
//       member: ...,
//       comment: ...,
//           } satisfies Prisma.reddit_like_community_comment_votesCreateInput;
//         }
//       }
//--------------------------------------------------------------