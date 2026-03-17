import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditLikeModeratorCollector {
  export async function collect(props: { body: IRedditLikeModerator.ICreate }) {
    const id: string = v4();
    const now = new Date();
    return {
      id,
      can_add_moderators: props.body.canAddModerators ?? false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      member: { connect: { id: props.body.memberId } },
      community: { connect: { id: props.body.communityId } },
    } satisfies Prisma.reddit_like_moderatorsCreateInput;
  }
}
