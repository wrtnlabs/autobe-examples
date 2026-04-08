import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCommunityPostVoteCollector {
  export async function collect(props: {
    body: IRedditCommunityPostVote.ICreate;
    redditCommunityMembers: IEntity; // from authorized actor
    redditCommunityPosts: IEntity; // from path parameter postId
  }) {
    const id: string = v4();
    return {
      id,
      vote_type: props.body.vote_type,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      post: { connect: { id: props.redditCommunityPosts.id } },
      member: { connect: { id: props.redditCommunityMembers.id } },
    } satisfies Prisma.reddit_community_post_votesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditCommunityPostVoteCollector {
//         export async function collect(props: {
//           body: IRedditCommunityPostVote.ICreate;
//           redditCommunityMembers: IEntity; // from authorized actor
// redditCommunityPosts: IEntity; // from path parameter postId
//           
//           
//         }) {
//           return {
//       id: ...,
//       vote_type: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       post: ...,
//       member: ...,
//           } satisfies Prisma.reddit_community_post_votesCreateInput;
//         }
//       }
//--------------------------------------------------------------