import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityCommentCollector {
  export async function collect(props: {
    body: ICommunityComment.ICreate;
    author: IEntity; // from authorized actor
    post: IEntity; // from path parameter postId
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      status: "active",
      author: { connect: { id: props.author.id } },
      post: { connect: { id: props.post.id } },
      parent: undefined,
    } satisfies Prisma.community_commentsCreateInput;
  }
}
