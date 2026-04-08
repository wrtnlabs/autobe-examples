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
    redditPlatformComments: IEntity;
    redditPlatformMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      vote_type: props.body.vote_type ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.redditPlatformMembers.id } },
      comment: { connect: { id: props.redditPlatformComments.id } },
    } satisfies Prisma.reddit_platform_comment_votesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditPlatformCommentVoteCollector {
//         export async function collect(props: {
//           body: IRedditPlatformCommentVote.ICreate;
//           redditPlatformComments: IEntity; // from path parameter {commentId}
// redditPlatformMembers: IEntity; // from authorized actor
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
//           } satisfies Prisma.reddit_platform_comment_votesCreateInput;
//         }
//       }
//--------------------------------------------------------------