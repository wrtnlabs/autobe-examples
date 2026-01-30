import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumPostComment";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EconomicForumPostCommentCollector {
  export async function collect(props: {
    body: IEconomicForumPostComment.ICreate;
    economicForumUsers: IEntity;
    economicForumUserSessions: IEntity;
    economicForumPosts: IEntity;
  }) {
    return {
      id: v4(),
      body: "",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      post: {
        connect: { id: props.economicForumPosts.id },
      },
      parent: undefined,
      user: {
        connect: { id: props.economicForumUsers.id },
      },
    } satisfies Prisma.economic_forum_post_commentsCreateInput;
  }
}
