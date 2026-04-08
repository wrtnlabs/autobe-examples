import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditPlatformPostVoteCollector {
  export async function collect(props: {
    body: IRedditPlatformPostVote.ICreate;
    redditPlatformMembers: IEntity; // from authorized actor
    redditPlatformPosts: IEntity; // from path parameter postId
  }) {
    const id: string = v4();
    return {
      id,
      vote_type: props.body.vote_type ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      member: { connect: { id: props.redditPlatformMembers.id } },
      post: { connect: { id: props.redditPlatformPosts.id } },
    } satisfies Prisma.reddit_platform_post_votesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditPlatformPostVoteCollector {
//         export async function collect(props: {
//           body: IRedditPlatformPostVote.ICreate;
//           redditPlatformMembers: IEntity; // from authorized actor
// redditPlatformPosts: IEntity; // from path parameter postId
//           
//           
//         }) {
//           return {
//       id: ...,
//       vote_type: ...,
//       created_at: ...,
//       updated_at: ...,
//       member: ...,
//       post: ...,
//           } satisfies Prisma.reddit_platform_post_votesCreateInput;
//         }
//       }
//--------------------------------------------------------------