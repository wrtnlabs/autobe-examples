import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditPostTextCollector {
  export async function collect(props: {
    body: IRedditPostText.ICreate;
    redditCommunities: IEntity;
    redditMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      post_type: props.body.post_type,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: { connect: { id: props.redditCommunities.id } },
      author: { connect: { id: props.redditMembers.id } },
    } satisfies Prisma.reddit_postsCreateInput;
  }
}
