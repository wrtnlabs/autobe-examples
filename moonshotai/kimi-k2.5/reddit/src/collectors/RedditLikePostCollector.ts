import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditLikePostCollector {
  export async function collect(props: {
    body: IRedditLikePost.ICreate;
    redditLikeMembers: IEntity; // from authorized actor
  }) {
    const id: string = v4();
    // Infer post_type from content fields if not explicitly provided
    const postType =
      props.body.post_type ??
      (props.body.body
        ? "text"
        : props.body.url
          ? "link"
          : props.body.attachment_id
            ? "image"
            : "text");
    return {
      id,
      title: props.body.title,
      post_type: postType,
      vote_score: 0,
      comment_count: 0,
      is_deleted: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      author: { connect: { id: props.redditLikeMembers.id } },
      community: { connect: { id: props.body.community_id } },
    } satisfies Prisma.reddit_like_postsCreateInput;
  }
}
