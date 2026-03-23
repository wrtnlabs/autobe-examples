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
  }) {
    return {
      id: v4(),
      title: props.body.title,
      content: props.body.content ?? null,
      post_type: props.body.postType,
      score: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: { connect: { id: props.body.communityId } },
      author: { connect: { id: props.redditCloneMembers.id } },
    } satisfies Prisma.reddit_clone_postsCreateInput;
  }
}
