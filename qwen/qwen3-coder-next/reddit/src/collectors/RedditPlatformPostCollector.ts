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
    redditPlatformUsers: IEntity;
    community: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      deleted_at: null,
      comment_count: 0,
      content_text: null,
      updated_at: new Date(),
      url: null,
      image_url: null,
      type: "text",
      title: "",
      vote_score: 0,
      author: { connect: { id: props.redditPlatformUsers.id } },
      community: { connect: { id: props.community.id } },
      // Optional relations omitted
    } satisfies Prisma.reddit_platform_postsCreateInput;
  }
}
