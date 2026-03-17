import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneBanCollector {
  export async function collect(props: {
    body: IRedditCloneBan.ICreate;
    redditCloneCommunities: IEntity;
    redditCloneMembers: IEntity;
    redditCloneMemberSessions: IEntity;
  }) {
    return {
      id: v4(),
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.body.member_id } },
      community: { connect: { id: props.redditCloneCommunities.id } },
      issuer: { connect: { id: props.redditCloneMembers.id } },
    } satisfies Prisma.reddit_clone_bansCreateInput;
  }
}
