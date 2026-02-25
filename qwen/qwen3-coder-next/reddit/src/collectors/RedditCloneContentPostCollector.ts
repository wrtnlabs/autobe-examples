import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneContentPostCollector {
  export async function collect(props: {
    body: IRedditCloneContentPost.ICreate;
    redditCloneMembers: IEntity;
    redditCloneCommunities: IEntity;
  }) {
    return {
      id: v4(),
      type: props.body.type,
      title: props.body.title,
      content: props.body.content ?? props.body.url ?? null,
      image_url: props.body.imageUrl ?? null,
      vote_score: 0,
      comment_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      author: { connect: { id: props.redditCloneMembers.id } },
      community: { connect: { id: props.redditCloneCommunities.id } },
      postText:
        props.body.type === "text"
          ? {
              create: {
                id: v4(),
                content: props.body.content ?? "",
              },
            }
          : undefined,
      link:
        props.body.type === "link"
          ? {
              create: {
                id: v4(),
                url: props.body.url ?? "",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            }
          : undefined,
      image:
        props.body.type === "image"
          ? {
              create: {
                id: v4(),
                image_url: props.body.imageUrl ?? "",
              },
            }
          : undefined,
    };
  }
}
