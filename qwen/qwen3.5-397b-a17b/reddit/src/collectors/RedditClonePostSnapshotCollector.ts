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
    redditCloneMembers: IEntity;
  }) {
    const id: string = v4();
    // Query post to get all snapshot data
    const post = await MyGlobal.prisma.reddit_clone_posts.findFirstOrThrow({
      where: { id: props.redditClonePosts.id },
    });
    // Query subtype table based on post_type for type-specific content
    let text_content: string | null = null;
    let link_url: string | null = null;
    let image_file_id: string | null = null;
    if (post.post_type === "TEXT") {
      const text = await MyGlobal.prisma.reddit_clone_post_texts.findFirst({
        where: { reddit_clone_post_id: post.id },
      });
      text_content = text?.body ?? null;
    } else if (post.post_type === "LINK") {
      const link = await MyGlobal.prisma.reddit_clone_post_links.findFirst({
        where: { reddit_clone_post_id: post.id },
      });
      link_url = link?.url ?? null;
    } else if (post.post_type === "IMAGE") {
      const image = await MyGlobal.prisma.reddit_clone_post_images.findFirst({
        where: { reddit_clone_post_id: post.id },
      });
      image_file_id = image?.file_uri ?? null;
    }
    return {
      id,
      title: post.title,
      post_type: post.post_type,
      text_content,
      link_url,
      image_file_id,
      created_at: new Date(),
      post: { connect: { id: props.redditClonePosts.id } },
      member: { connect: { id: post.member_id } },
      community: { connect: { id: post.community_id } },
    } satisfies Prisma.reddit_clone_post_snapshotsCreateInput;
  }
}
