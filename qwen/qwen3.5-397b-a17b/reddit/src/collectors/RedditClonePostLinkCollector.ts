import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditClonePostLinkCollector {
  export async function collect(props: {
    body: IRedditClonePostLink.ICreate;
    redditClonePosts: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      url: props.body.url,
      post: { connect: { id: props.redditClonePosts.id } },
    } satisfies Prisma.reddit_clone_post_linksCreateInput;
  }
}
