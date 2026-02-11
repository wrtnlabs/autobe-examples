import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedView";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditPlatformFeedViewCollector {
  export async function collect(props: {
    body: IRedditPlatformFeedView.ICreate;
  }) {
    return {
      id: v4(),
      session_id: props.body.session_id,
      feed_type: props.body.feed_type,
      user_agent: props.body.user_agent ?? null,
      ip_address: props.body.ip_address ?? null,
      viewed_at: new Date(),
      engagement_duration: props.body.engagement_duration ?? null,
      items_viewed: props.body.items_viewed ?? null,
      user: { connect: { id: props.body.user_id } },
      feedResult: props.body.feed_result_id
        ? { connect: { id: props.body.feed_result_id } }
        : undefined,
      community: props.body.community_id
        ? { connect: { id: props.body.community_id } }
        : undefined,
    } satisfies Prisma.reddit_platform_feed_viewsCreateInput;
  }
}
