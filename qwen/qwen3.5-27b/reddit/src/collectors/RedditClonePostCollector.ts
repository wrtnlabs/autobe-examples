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
    redditCloneUserProfiles: IEntity;
  }) {
    return {
      id: v4(),
      title: props.body.title,
      post_type: props.body.post_type,
      text_content: props.body.text_content ?? null,
      link_url: props.body.link_url ?? null,
      image_url: props.body.image_url ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      userProfile: { connect: { id: props.redditCloneUserProfiles.id } },
      community: { connect: { id: props.body.community_id } },
    } satisfies Prisma.reddit_clone_postsCreateInput;
  }
}
