import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { RedditCommunityPostFileCollector } from "./RedditCommunityPostFileCollector";

export namespace RedditCommunityPostCollector {
  export async function collect(props: {
    body: IRedditCommunityPost.ICreate;
    redditCommunityMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      post_type: props.body.post_type,
      text_content: props.body.text_content ?? null,
      link_url: props.body.link_url ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      vote_score: 0,
      comment_count: 0,
      author: { connect: { id: props.redditCommunityMembers.id } },
      community: { connect: { id: props.body.reddit_community_community_id } },
      snapshots: undefined,
      files: props.body.files?.length
        ? {
            create: await ArrayUtil.asyncMap(props.body.files, (file, i) =>
              RedditCommunityPostFileCollector.collect({
                body: file,
                redditCommunityPosts: props.redditCommunityMembers,
              }),
            ),
          }
        : undefined,
      votes: undefined,
      comments: undefined,
      redditCommunityPostReports: undefined,
      redditPostReports: undefined,
    } satisfies Prisma.reddit_community_postsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditCommunityPostCollector {
//         export async function collect(props: {
//           body: IRedditCommunityPost.ICreate;
//           redditCommunityMembers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       title: ...,
//       post_type: ...,
//       text_content: ...,
//       link_url: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       vote_score: ...,
//       comment_count: ...,
//       author: ...,
//       community: ...,
//       snapshots: ...,
//       files: ...,
//       votes: ...,
//       comments: ...,
//       redditCommunityPostReports: ...,
//       redditPostReports: ...,
//           } satisfies Prisma.reddit_community_postsCreateInput;
//         }
//       }
//--------------------------------------------------------------