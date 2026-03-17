import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditClonePostTextCollector {
  export async function collect(props: {
    body: IRedditClonePostText.ICreate;
    post: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      body: props.body.body,
      created_at: new Date(),
      updated_at: new Date(),
      post: { connect: { id: props.post.id } },
    } satisfies Prisma.reddit_clone_post_textsCreateInput;
  }
}
