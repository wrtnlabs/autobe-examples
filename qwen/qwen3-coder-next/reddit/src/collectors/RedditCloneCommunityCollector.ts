import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneCommunityCollector {
  export async function collect(props: {
    body: IRedditCloneCommunity.ICreate;
    redditCloneOwners: IEntity;
    redditCloneOwnerSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description ?? null,
      icon_url: props.body.icon_url ?? null,
      subscriber_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      owner: { connect: { id: props.redditCloneOwners.id } },
    } satisfies Prisma.reddit_clone_communitiesCreateInput;
  }
}
