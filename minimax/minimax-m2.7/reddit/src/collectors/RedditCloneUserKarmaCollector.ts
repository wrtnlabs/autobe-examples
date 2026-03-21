import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCloneUserKarmaCollector {
  export async function collect(props: {
    body: IRedditCloneUserKarma.ICreate;
    redditCloneCommunities: IEntity;
    redditCloneMembers: IEntity;
    redditCloneMemberSessions: IEntity;
  }) {
    const id: string = v4();
    // Query member by username to get the banned user's ID
    const bannedMember =
      await MyGlobal.prisma.reddit_clone_members.findFirstOrThrow({
        where: {
          username: props.body.bannedUsername,
          deleted_at: null,
        },
      });
    return {
      // Scalar fields
      id,
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      expires_at: props.body.expires_at
        ? new Date(props.body.expires_at)
        : null,
      // BelongsTo relations (use relation property name, NOT table name)
      community: { connect: { id: props.redditCloneCommunities.id } },
      bannedUser: { connect: { id: bannedMember.id } },
      issuer: { connect: { id: props.redditCloneMembers.id } },
    } satisfies Prisma.reddit_clone_bansCreateInput;
  }
}
