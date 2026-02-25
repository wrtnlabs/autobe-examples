import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCommunityPostCollector {
  export async function collect(props: {
    body: IRedditCommunityPost.ICreate;
    redditCommunityMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      content: props.body.content ?? null,
      url: props.body.url ?? null,
      image_url: props.body.image_url ?? null,
      vote_score: 0,
      comment_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      is_deleted: false,
      author: { connect: { id: props.redditCommunityMembers.id } },
      community: { connect: { id: props.body.community_id } },
      votes: undefined,
      comments: undefined,
    } satisfies Prisma.reddit_community_postsCreateInput;
  }
}
