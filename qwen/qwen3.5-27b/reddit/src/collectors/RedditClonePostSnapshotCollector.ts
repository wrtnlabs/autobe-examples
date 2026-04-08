import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditClonePostSnapshotCollector {
  export async function collect(props: {
    body: IRedditClonePostSnapshot.ICreate;
    redditClonePosts: IEntity;
  }) {
    const id: string = v4();
    // Query the post to capture its current state for the snapshot
    const post = await MyGlobal.prisma.reddit_clone_posts.findFirstOrThrow({
      where: { id: props.redditClonePosts.id },
    });
    return {
      id,
      title: post.title,
      post_type: post.post_type,
      text_content: post.text_content ?? null,
      link_url: post.link_url ?? null,
      image_url: post.image_url ?? null,
      snapshot_created_at: new Date(),
      post: { connect: { id: props.redditClonePosts.id } },
    } satisfies Prisma.reddit_clone_post_snapshotsCreateInput;
  }
}
