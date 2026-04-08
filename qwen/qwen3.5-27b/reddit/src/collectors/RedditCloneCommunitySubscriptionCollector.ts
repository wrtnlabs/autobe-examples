import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneCommunitySubscriptionCollector {
  export async function collect(props: {
    body: IRedditCloneCommunitySubscription.ICreate;
    redditCloneMembers: IEntity;
  }) {
    return {
      id: v4(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.redditCloneMembers.id } },
      community: { connect: { id: props.body.community_id } },
    } satisfies Prisma.reddit_clone_community_subscriptionsCreateInput;
  }
}
