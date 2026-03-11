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
    author: IEntity;
    community: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      type: props.body.type,
      content: props.body.content ?? null,
      url: props.body.url ?? null,
      image_url: props.body.image_url ?? null,
      score: 0,
      comment_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      author: { connect: { id: props.author.id } },
      community: { connect: { id: props.community.id } },
    } satisfies Prisma.reddit_like_postsCreateInput;
  }
}
