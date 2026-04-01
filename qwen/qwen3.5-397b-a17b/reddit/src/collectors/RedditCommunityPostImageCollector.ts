import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCommunityPostImageCollector {
  export async function collect(props: {
    body: IRedditCommunityPostImage.ICreate;
    redditCommunityPosts: IEntity;
    sequence: number;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      file_path: props.body.filePath,
      file_size: props.body.fileSize,
      mime_type: props.body.mimeType,
      width: props.body.width,
      height: props.body.height,
      sort_order: props.sequence,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      post: { connect: { id: props.redditCommunityPosts.id } },
    } satisfies Prisma.reddit_community_post_imagesCreateInput;
  }
}
