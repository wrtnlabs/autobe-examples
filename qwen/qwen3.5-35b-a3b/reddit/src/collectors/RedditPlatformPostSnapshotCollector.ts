import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditPlatformPostSnapshotCollector {
  export async function collect(props: {
    body: IRedditPlatformPostSnapshot.ICreate;
    redditPlatformPosts: IEntity;
    redditPlatformMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      content: props.body.content ?? null,
      post_type: props.body.post_type,
      url: props.body.url ?? null,
      image_url: props.body.image_url ?? null,
      vote_score: props.body.vote_score,
      comment_count: props.body.comment_count,
      snapshot_type: props.body.snapshot_type,
      created_at: new Date(),
      post: { connect: { id: props.redditPlatformPosts.id } },
      author: { connect: { id: props.redditPlatformMembers.id } },
    } satisfies Prisma.reddit_platform_post_snapshotsCreateInput;
  }
}
