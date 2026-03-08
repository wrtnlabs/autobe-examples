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
    redditPlatformMembers: IEntity;
    redditPlatformMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      content: props.body.content ?? null,
      post_type: props.body.postType,
      url: props.body.url ?? null,
      image_url: props.body.imageUrl ?? null,
      vote_score: 0,
      comment_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      author: { connect: { id: props.redditPlatformMembers.id } },
      community: { connect: { id: props.body.redditPlatformCommunityId } },
    } satisfies Prisma.reddit_platform_postsCreateInput;
  }
}
