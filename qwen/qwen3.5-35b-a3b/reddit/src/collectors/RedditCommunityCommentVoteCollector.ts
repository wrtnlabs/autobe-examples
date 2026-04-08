import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCommunityCommentVoteCollector {
  export async function collect(props: {
    body: IRedditCommunityCommentVote.ICreate;
    redditCommunityMembers: IEntity;
    redditCommunityComments: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      vote_type: props.body.vote_type,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.redditCommunityMembers.id } },
      comment: { connect: { id: props.redditCommunityComments.id } },
    } satisfies Prisma.reddit_community_comment_votesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditCommunityCommentVoteCollector {
//         export async function collect(props: {
//           body: IRedditCommunityCommentVote.ICreate;
//           redditCommunityMembers: IEntity; // from authorized actor
// redditCommunityComments: IEntity; // from path parameter commentId
//           
//           
//         }) {
//           return {
//       id: ...,
//       vote_type: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       member: ...,
//       comment: ...,
//           } satisfies Prisma.reddit_community_comment_votesCreateInput;
//         }
//       }
//--------------------------------------------------------------