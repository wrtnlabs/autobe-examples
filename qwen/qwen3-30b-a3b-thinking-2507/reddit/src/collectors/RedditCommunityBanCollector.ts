import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCommunityBanCollector {
  export async function collect(props: {
    body: IRedditCommunityBan.ICreate;
    redditCommunities: IEntity;
  }) {
    const id = v4();
    return {
      id,
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      community: { connect: { id: props.redditCommunities.id } },
      user: { connect: { id: props.body.user_id } },
    } satisfies Prisma.reddit_community_bansCreateInput;
  }
}
