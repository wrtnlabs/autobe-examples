import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditClonePostImageCollector {
  export async function collect(props: {
    body: IRedditClonePostImage.ICreate;
    post: IEntity;
    fileUrl: string;
    sequence: number;
  }) {
    const id = v4();
    return {
      id,
      file_url: props.fileUrl,
      sequence: props.sequence,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      post: { connect: { id: props.post.id } },
    } satisfies Prisma.reddit_clone_post_imagesCreateInput;
  }
}
