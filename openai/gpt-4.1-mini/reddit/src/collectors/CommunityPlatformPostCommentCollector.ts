import { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformPostCommentCollector {
  export async function collect(props: {
    body: ICommunityPlatformPostComment.ICreate;
    post: IEntity;
    user: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      content_text: "",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      post: { connect: { id: props.post.id } },
      user: { connect: { id: props.user.id } },
      parentComment: undefined, // no parentCommentId field in DTO
      // recursive is a hasMany relation, not for create input
    } satisfies Prisma.community_platform_post_commentsCreateInput;
  }
}
