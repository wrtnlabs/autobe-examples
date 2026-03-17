import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImage";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditLikePostImageCollector {
  export async function collect(props: {
    body: IRedditLikePostImage.ICreate;
    redditLikePosts: IEntity;
  }) {
    return {
      id: v4(),
      display_order: props.body.displayOrder,
      created_at: new Date(),
      post: { connect: { id: props.redditLikePosts.id } },
      attachment: { connect: { id: props.body.attachmentId } },
    } satisfies Prisma.reddit_like_post_imagesCreateInput;
  }
}
