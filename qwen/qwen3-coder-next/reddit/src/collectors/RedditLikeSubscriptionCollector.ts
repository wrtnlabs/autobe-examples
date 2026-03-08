import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSubscription";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditLikeSubscriptionCollector {
  export async function collect(props: {
    body: IRedditLikeSubscription.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      status: props.body.status ?? "subscribed",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.body.reddit_like_member_id } },
      community: { connect: { id: props.body.reddit_like_community_id } },
    } satisfies Prisma.reddit_like_subscriptionsCreateInput;
  }
}
