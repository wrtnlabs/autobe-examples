import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditLikeCommunitySubscriptionCollector {
  export async function collect(props: {
    body: IRedditLikeCommunitySubscription.ICreate;
    redditLikeMember: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      redditLikeMember: { connect: { id: props.redditLikeMember.id } },
      redditLikeCommunity: { connect: { id: props.body.communityId } },
    } satisfies Prisma.reddit_like_community_subscriptionsCreateInput;
  }
}
