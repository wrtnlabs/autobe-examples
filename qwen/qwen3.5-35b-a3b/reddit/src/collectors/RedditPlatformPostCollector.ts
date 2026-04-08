import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditPlatformPostCollector {
  export async function collect(props: {
    body: IRedditPlatformPost.ICreate;
    redditPlatformMembers: IEntity;
  }) {
    const id: string = v4();
    const postType = props.body.post_type;
    return {
      id,
      title: props.body.title,
      post_type: postType,
      upvotes_count: 0,
      downvotes_count: 0,
      comment_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: { connect: { id: props.body.community_id } },
      author: { connect: { id: props.redditPlatformMembers.id } },
      textContent:
        postType === "text"
          ? {
              create: {
                id: v4(),
                text_content: props.body.text_content,
                created_at: new Date(),
                updated_at: new Date(),
              },
            }
          : undefined,
      linkPost:
        postType === "link"
          ? {
              create: {
                id: v4(),
                url: props.body.url,
                created_at: new Date(),
                updated_at: new Date(),
              },
            }
          : undefined,
      image:
        postType === "image"
          ? {
              create: {
                id: v4(),
                image_url: props.body.image_url,
                image_alt_text: props.body.image_alt_text ?? null,
                created_at: new Date(),
                updated_at: new Date(),
              },
            }
          : undefined,
    } satisfies Prisma.reddit_platform_postsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditPlatformPostCollector {
//         export async function collect(props: {
//           body: IRedditPlatformPost.ICreate;
//           redditPlatformMembers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       title: ...,
//       post_type: ...,
//       upvotes_count: ...,
//       downvotes_count: ...,
//       comment_count: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       community: ...,
//       author: ...,
//       snapshots: ...,
//       textContent: ...,
//       linkPost: ...,
//       image: ...,
//       comments: ...,
//       postVotes: ...,
//           } satisfies Prisma.reddit_platform_postsCreateInput;
//         }
//       }
//--------------------------------------------------------------