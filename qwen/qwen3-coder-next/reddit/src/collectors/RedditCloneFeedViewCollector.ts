import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedView";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneFeedViewCollector {
  export async function collect(props: { body: IRedditCloneFeedView.ICreate }) {
    const id: string = v4();
    return {
      id,
      cache_key: props.body.cache_key,
      ttl_seconds: props.body.ttl_seconds,
      is_stale: false,
      last_refreshed_at: null,
      last_content_updated_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      feedConfig: { connect: { id: props.body.feed_config_id } },
    } satisfies Prisma.reddit_clone_feed_viewsCreateInput;
  }
}
