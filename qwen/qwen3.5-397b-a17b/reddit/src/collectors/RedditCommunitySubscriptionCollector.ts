import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCommunitySubscriptionCollector {
  export async function collect(props: {
    body: IRedditCommunitySubscription.ICreate;
    redditCommunityMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.redditCommunityMembers.id } },
      community: { connect: { id: props.body.community_id } },
    } satisfies Prisma.reddit_community_subscriptionsCreateInput;
  }
}
