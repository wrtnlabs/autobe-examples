import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneModeratorCollector {
  export async function collect(props: {
    body: IRedditCloneModerator.ICreate;
    redditCloneCommunities: IEntity;
    redditCloneMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      is_owner: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      member: { connect: { id: props.body.member_id } },
      community: { connect: { id: props.redditCloneCommunities.id } },
      addedBy: { connect: { id: props.redditCloneMembers.id } },
      // HasMany relations (not needed - reverse relation)
    } satisfies Prisma.reddit_clone_moderatorsCreateInput;
  }
}
