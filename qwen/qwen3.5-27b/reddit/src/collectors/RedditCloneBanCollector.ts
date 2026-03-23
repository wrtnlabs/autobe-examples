import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneBanCollector {
  export async function collect(props: {
    body: IRedditCloneBan.ICreate;
    redditCloneCommunities: IEntity;
  }) {
    return {
      id: v4(),
      reason: props.body.reason ?? null,
      banned_at: new Date(),
      lifted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: { connect: { id: props.redditCloneCommunities.id } },
      member: { connect: { id: props.body.member_id } },
    } satisfies Prisma.reddit_clone_bansCreateInput;
  }
}
