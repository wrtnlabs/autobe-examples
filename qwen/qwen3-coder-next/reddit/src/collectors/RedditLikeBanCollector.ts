import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeBan";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditLikeBanCollector {
  export async function collect(props: { body: IRedditLikeBan.ICreate }) {
    const id: string = v4();
    return {
      id,
      status: props.body.status,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      bannedUser: { connect: { id: props.body.reddit_like_user_id } },
      bannedCommunity: { connect: { id: props.body.reddit_like_community_id } },
    } satisfies Prisma.reddit_like_bansCreateInput;
  }
}
