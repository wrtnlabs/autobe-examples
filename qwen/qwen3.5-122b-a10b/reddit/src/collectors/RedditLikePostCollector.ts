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
    member: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      content_type: props.body.content_type,
      content_text: props.body.content_text ?? null,
      content_url: props.body.content_url ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: { connect: { id: props.body.community_id } },
      member: { connect: { id: props.member.id } },
    } satisfies Prisma.reddit_like_postsCreateInput;
  }
}
