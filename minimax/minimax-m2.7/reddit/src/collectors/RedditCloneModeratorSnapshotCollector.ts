import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneModeratorSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneModeratorSnapshotCollector {
  export async function collect(props: {
    body: IRedditCloneModeratorSnapshot.ICreate;
    redditCloneCommunities: IEntity;
    redditCloneMembers: IEntity;
  }) {
    // Lookup member by username to get their id
    const member = await MyGlobal.prisma.reddit_clone_members.findFirstOrThrow({
      where: { username: props.body.memberUsername },
    });
    return {
      id: v4(),
      role: "moderator",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: member.id } },
      community: { connect: { id: props.redditCloneCommunities.id } },
      assigner: { connect: { id: props.redditCloneMembers.id } },
    } satisfies Prisma.reddit_clone_moderatorsCreateInput;
  }
}
