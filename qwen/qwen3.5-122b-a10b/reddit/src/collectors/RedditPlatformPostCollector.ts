import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditPlatformPostCollector {
  export async function collect(props: {
    body: IRedditPlatformPost.ICreate;
    author: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      post_type: props.body.post_type,
      text_content: props.body.text_content ?? null,
      url: props.body.url ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: { connect: { id: props.body.community_id } },
      author: { connect: { id: props.author.id } },
      file: props.body.file_id
        ? { connect: { id: props.body.file_id } }
        : undefined,
      votes: undefined,
      snapshots: undefined,
      comments: undefined,
      reports: undefined,
    } satisfies Prisma.reddit_platform_postsCreateInput;
  }
}
