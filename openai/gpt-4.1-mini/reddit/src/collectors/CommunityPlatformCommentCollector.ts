import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformCommentCollector {
  export async function collect(props: {
    body: ICommunityPlatformComment.ICreate & {
      content: string;
    };
    user: IEntity;
    post: IEntity;
    parent?: IEntity | null;
  }) {
    const id = v4();
    const now = new Date();
    return {
      id,
      content: props.body.content,
      is_deleted: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      user: { connect: { id: props.user.id } },
      post: { connect: { id: props.post.id } },
      parent: props.parent ? { connect: { id: props.parent.id } } : undefined,
    } satisfies Prisma.community_platform_commentsCreateInput;
  }
}
