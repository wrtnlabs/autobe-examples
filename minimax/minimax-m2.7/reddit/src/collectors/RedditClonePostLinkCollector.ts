import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditClonePostLinkCollector {
  export async function collect(props: {
    body: IRedditClonePostLink.ICreate;
    redditCloneMembers: IEntity;
    redditCloneCommunities: IEntity;
  }) {
    return {
      // Scalar fields
      id: v4(),
      title: props.body.title,
      type: props.body.type,
      vote_score: 0,
      comment_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      author: { connect: { id: props.redditCloneMembers.id } },
      community: { connect: { id: props.redditCloneCommunities.id } },
      // HasOne: link content for link-type posts
      link:
        props.body.type === "link"
          ? {
              create: {
                id: v4(),
                url: "",
                created_at: new Date(),
                updated_at: new Date(),
              },
            }
          : undefined,
      // Other HasOne relations (not applicable for this collector)
      postTextContent: undefined,
      image: undefined,
      // HasMany relations (reverse side, skip)
      comments: undefined,
      postVotes: undefined,
    } satisfies Prisma.reddit_clone_postsCreateInput;
  }
}
