import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditClonePostCollector {
  export async function collect(props: {
    body: IRedditClonePost.ICreate;
    redditCloneMembers: IEntity;
    redditCloneMemberSessions: IEntity;
  }) {
    const id = v4();
    const now = new Date();
    return {
      // Scalar fields
      id,
      title: props.body.title,
      type: props.body.type,
      vote_score: 0,
      comment_count: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      // BelongsTo relations
      author: { connect: { id: props.redditCloneMembers.id } },
      community: { connect: { id: props.body.communityId } },
      // HasOne relations - polymorphic based on type discriminator
      postTextContent:
        props.body.type === "text" && props.body.body !== undefined
          ? {
              create: {
                id: v4(),
                body: props.body.body,
              },
            }
          : undefined,
      link:
        props.body.type === "link" && props.body.url !== undefined
          ? {
              create: {
                id: v4(),
                url: props.body.url,
                created_at: now,
                updated_at: now,
              },
            }
          : undefined,
      image:
        props.body.type === "image" && props.body.fileId !== undefined
          ? {
              create: {
                id: v4(),
                file: { connect: { id: props.body.fileId } },
                created_at: now,
                updated_at: now,
              },
            }
          : undefined,
    } satisfies Prisma.reddit_clone_postsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace RedditClonePostCollector {
//         export async function collect(props: {
//           body: IRedditClonePost.ICreate;
//           redditCloneMembers: IEntity; // from authorized actor
// redditCloneMemberSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       title: ...,
//       type: ...,
//       vote_score: ...,
//       comment_count: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       author: ...,
//       community: ...,
//       postTextContent: ...,
//       link: ...,
//       image: ...,
//       comments: ...,
//       postVotes: ...,
//           } satisfies Prisma.reddit_clone_postsCreateInput;
//         }
//       }
//--------------------------------------------------------------