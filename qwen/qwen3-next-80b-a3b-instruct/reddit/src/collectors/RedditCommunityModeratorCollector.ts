import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCommunityModeratorCollector {
  export async function collect(props: {
    body: IRedditCommunityModerator.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      created_at: new Date(),
      user: { connect: { id: props.body.user_id } },
      community: { connect: { id: props.body.community_id } },
    } satisfies Prisma.reddit_community_moderatorsCreateInput;
  }
}
