import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditPlatformPostImageCollector {
  export async function collect(props: {
    body: IRedditPlatformPostImage.ICreate;
    redditPlatformPosts: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      filename: props.body.filename,
      mime_type: props.body.mime_type,
      file_size: props.body.file_size,
      file_path: props.body.file_path,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      post: { connect: { id: props.redditPlatformPosts.id } },
    } satisfies Prisma.reddit_platform_post_imagesCreateInput;
  }
}
