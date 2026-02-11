import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeration";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditPlatformModerationCollector {
  export async function collect(props: {
    body: IRedditPlatformModeration.ICreate;
  }) {
    return {
      id: v4(),
      role: props.body.role,
      created_at: new Date(),
      community: { connect: { id: props.body.community_id } },
      user: { connect: { id: props.body.user_id } },
    } satisfies Prisma.reddit_platform_moderationsCreateInput;
  }
}
