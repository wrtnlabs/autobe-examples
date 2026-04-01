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
      // Scalar fields
      id,
      title: props.body.title,
      post_type: props.body.post_type,
      text_content: props.body.text_content ?? null,
      link_url: props.body.link_url ?? null,
      image_path: props.body.image_path ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      author: { connect: { id: props.redditCommunityMembers.id } },
      community: { connect: { id: props.body.communityId } },
      // HasMany relations - not created during post creation
      // images, snapshots, comments, votes are separate operations
    } satisfies Prisma.reddit_community_postsCreateInput;
  }
}
