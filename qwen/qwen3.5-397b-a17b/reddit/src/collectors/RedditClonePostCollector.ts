import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditClonePostCollector {
  export async function collect(props: {
    body: IRedditClonePost.ICreate;
    member: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      title: props.body.title,
      post_type: props.body.post_type,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      member: { connect: { id: props.member.id } },
      community: { connect: { id: props.body.community_id } },
      // HasOne relations - conditional based on post_type
      text:
        props.body.post_type === "TEXT" && props.body.text
          ? {
              create: {
                id: v4(),
                body: props.body.text.body,
                created_at: new Date(),
                updated_at: new Date(),
              },
            }
          : undefined,
      link:
        props.body.post_type === "LINK" && props.body.link
          ? {
              create: {
                id: v4(),
                url: props.body.link.url,
              },
            }
          : undefined,
      postImage:
        props.body.post_type === "IMAGE" && props.body.image
          ? {
              create: {
                id: v4(),
                file_uri: props.body.image.fileUri,
                created_at: new Date(),
                updated_at: new Date(),
              },
            }
          : undefined,
      // HasMany relations - not needed for creation
    } satisfies Prisma.reddit_clone_postsCreateInput;
  }
}
