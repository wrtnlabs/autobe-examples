import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditClonePostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditClonePostVoteCollector {
  export async function collect(props: {
    body: IRedditClonePostVote.ICreate;
    redditCloneMembers: IEntity;
    redditClonePosts: IEntity;
  }) {
    return {
      id: v4(),
      direction: props.body.direction,
      created_at: new Date(),
      updated_at: new Date(),
      member: { connect: { id: props.redditCloneMembers.id } },
      post: { connect: { id: props.redditClonePosts.id } },
    } satisfies Prisma.reddit_clone_post_votesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditClonePostVoteCollector {
//         export async function collect(props: {
//           body: IRedditClonePostVote.ICreate;
//           redditCloneMembers: IEntity; // from authorized actor
// redditClonePosts: IEntity; // from path parameter postId
//           
//           
//         }) {
//           return {
//       id: ...,
//       direction: ...,
//       created_at: ...,
//       updated_at: ...,
//       member: ...,
//       post: ...,
//           } satisfies Prisma.reddit_clone_post_votesCreateInput;
//         }
//       }
//--------------------------------------------------------------