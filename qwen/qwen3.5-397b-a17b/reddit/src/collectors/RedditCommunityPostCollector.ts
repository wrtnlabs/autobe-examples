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
    redditCommunityMemberSessions: IEntity;
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      // Scalar fields
      id,
      title: props.body.title,
      post_type: props.body.post_type,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      // BelongsTo relations
      member: { connect: { id: props.redditCommunityMembers.id } },
      community: { connect: { id: props.body.community_id } },
      // HasOne relations - type-specific content based on post_type discriminator
      text:
        props.body.post_type === "text"
          ? {
              create: {
                id: v4(),
                body: props.body.body ?? "",
                created_at: now,
                updated_at: now,
              },
            }
          : undefined,
      link:
        props.body.post_type === "link"
          ? {
              create: {
                id: v4(),
                url: props.body.url ?? "",
                domain: "",
                created_at: now,
                updated_at: now,
              },
            }
          : undefined,
      image:
        props.body.post_type === "image"
          ? {
              create: {
                id: v4(),
                image_url: props.body.image_url ?? "",
                created_at: now,
                updated_at: now,
              },
            }
          : undefined,
      // HasMany relations - not created at post creation time
      // comments, votes, reports are created separately
    } satisfies Prisma.reddit_community_postsCreateInput;
  }
}
