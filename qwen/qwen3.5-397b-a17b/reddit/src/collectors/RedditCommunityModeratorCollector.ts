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
    community: IEntity;
    addedBy: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations (use relation names, NOT FK column names)
      community: { connect: { id: props.community.id } },
      member: { connect: { id: props.body.member_id } },
      addedBy: { connect: { id: props.addedBy.id } },
    } satisfies Prisma.reddit_community_moderatorsCreateInput;
  }
}
