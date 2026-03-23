import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikePostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostRevision";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditLikePostRevisionCollector {
  export async function collect(props: {
    body: IRedditLikePostRevision.ICreate;
    redditLikePosts: IEntity;
    revisionNumber: number;
  }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      content: props.body.content ?? null,
      url: props.body.url ?? null,
      image_url: props.body.imageUrl ?? null,
      revision_number: props.revisionNumber,
      created_at: new Date(),
      post: { connect: { id: props.redditLikePosts.id } },
    } satisfies Prisma.reddit_like_post_revisionsCreateInput;
  }
}
