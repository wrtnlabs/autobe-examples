import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorAssignment";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneModeratorAssignmentCollector {
  export async function collect(props: {
    body: IRedditCloneModeratorAssignment.ICreate;
    redditCloneCommunities: IEntity;
    redditCloneMembers: IEntity;
    redditCloneMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      role: props.body.role,
      assigned_at: new Date(),
      status: "active",
      revoked_at: null,
      revoked_by_id: null,
      created_at: new Date(),
      updated_at: new Date(),
      community: { connect: { id: props.redditCloneCommunities.id } },
      appointedActor: { connect: { id: props.redditCloneMembers.id } },
      appointingActor: { connect: { id: props.redditCloneMembers.id } },
    } satisfies Prisma.reddit_clone_moderator_assignmentsCreateInput;
  }
}
