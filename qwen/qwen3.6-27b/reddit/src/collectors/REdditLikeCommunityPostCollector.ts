import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace REdditLikeCommunityPostCollector {
  export async function collect(props: {
    body: IREdditLikeCommunityPost.ICreate;
    redditLikeCommunityMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      post_type: props.body.post_type,
      body: props.body.body ?? null,
      url: props.body.url ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      author: { connect: { id: props.redditLikeCommunityMembers.id } },
      community: { connect: { id: props.body.community_id } },
    } satisfies Prisma.reddit_like_community_postsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace REdditLikeCommunityPostCollector {
//         export async function collect(props: {
//           body: IREdditLikeCommunityPost.ICreate;
//           redditLikeCommunityMembers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       title: ...,
//       post_type: ...,
//       body: ...,
//       url: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       author: ...,
//       community: ...,
//       snapshots: ...,
//       postComments: ...,
//       postImage: ...,
//       comments: ...,
//       commentCommentSnapshots: ...,
//       postVotes: ...,
//       reportOnPosts: ...,
//           } satisfies Prisma.reddit_like_community_postsCreateInput;
//         }
//       }
//--------------------------------------------------------------