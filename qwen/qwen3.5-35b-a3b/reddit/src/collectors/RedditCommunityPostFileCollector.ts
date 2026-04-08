import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCommunityPostFileCollector {
  export async function collect(props: {
    body: IRedditCommunityPostFile.ICreate;
    redditCommunityPosts: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      file_name: props.body.file_name,
      file_type: props.body.file_type,
      file_size: props.body.file_size,
      file_url: props.body.file_url,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      post: { connect: { id: props.redditCommunityPosts.id } },
    } satisfies Prisma.reddit_community_post_filesCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditCommunityPostFileCollector {
//         export async function collect(props: {
//           body: IRedditCommunityPostFile.ICreate;
//           redditCommunityPosts: IEntity; // from path parameter postId
//           
//           
//         }) {
//           return {
//       id: ...,
//       file_name: ...,
//       file_type: ...,
//       file_size: ...,
//       file_url: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       post: ...,
//           } satisfies Prisma.reddit_community_post_filesCreateInput;
//         }
//       }
//--------------------------------------------------------------