import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneBlock } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBlock";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneBlockCollector {
  export async function collect(props: {
    body: IRedditCloneBlock.ICreate;
    redditCloneMembers: IEntity;
  }) {
    return {
      id: v4(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      blocker: { connect: { id: props.redditCloneMembers.id } },
      blockedUser: { connect: { id: props.body.blocked_user_id } },
    } satisfies Prisma.reddit_clone_blocksCreateInput;
  }
}
