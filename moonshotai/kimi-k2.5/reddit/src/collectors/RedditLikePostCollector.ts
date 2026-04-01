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
    redditLikeMembers: IEntity;
    redditLikeMemberSessions: IEntity;
  }): Promise<Prisma.reddit_like_postsCreateInput> {
    const id = v4();
    const postType =
      props.body.post_type ??
      (props.body.url ? "link" : props.body.attachment_id ? "image" : "text");
    const createInput: Prisma.reddit_like_postsCreateInput = {
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
    };
    if (postType === "text" && props.body.body) {
      createInput.textContent = {
        create: {
          id: v4(),
          body: props.body.body,
          excerpt: props.body.excerpt ?? "",
          created_at: new Date(),
          updated_at: new Date(),
        },
      };
    } else if (postType === "link" && props.body.url) {
      const domain = new URL(props.body.url).hostname;
      createInput.linkContent = {
        create: {
          id: v4(),
          url: props.body.url,
          domain,
          created_at: new Date(),
          updated_at: new Date(),
        },
      };
    } else if (postType === "image" && props.body.attachment_id) {
      createInput.imageContent = {
        create: {
          id: v4(),
          attachment: { connect: { id: props.body.attachment_id } },
          thumbnail_generated: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
      };
    }
    return createInput satisfies Prisma.reddit_like_postsCreateInput;
  }
}
