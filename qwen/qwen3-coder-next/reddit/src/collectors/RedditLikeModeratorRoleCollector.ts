import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditLikeModeratorRoleCollector {
  export async function collect(props: {
    body: IRedditLikeModeratorRole.ICreate;
    redditLikeCommunities: IEntity;
    redditLikeMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      role: props.body.role,
      created_at: new Date(),
      user: { connect: { id: props.redditLikeMembers.id } },
      community: { connect: { id: props.redditLikeCommunities.id } },
    } satisfies Prisma.reddit_like_moderator_rolesCreateInput;
  }
}
