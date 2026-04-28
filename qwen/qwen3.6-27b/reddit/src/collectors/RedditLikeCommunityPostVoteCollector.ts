import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditLikeCommunityPostVoteCollector {
  export async function collect(props: {
    body: IRedditLikeCommunityPostVote.ICreate;
    post: IEntity;
    member: IEntity;
  }) {
    return {
      id: v4(),
      direction: props.body.direction,
      created_at: new Date(),
      updated_at: new Date(),
      member: { connect: { id: props.member.id } },
      post: { connect: { id: props.post.id } },
    } satisfies Prisma.reddit_like_community_post_votesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditLikeCommunityPostVoteCollector {
//         export async function collect(props: {
//           body: IRedditLikeCommunityPostVote.ICreate;
//           redditLikeCommunityPosts: IEntity; // from path parameter postId
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
//       post: ...,
//           } satisfies Prisma.reddit_like_community_post_votesCreateInput;
//         }
//       }
//--------------------------------------------------------------