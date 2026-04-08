import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityMemberAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        username: true,
        display_name: true,
        bio: true,
        avatar: true,
        karma: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        passwordResets: true,
        emailVerifications: true,
        profile: true,
        ownedCommunities: true,
        posts: true,
        comments: true,
        postVotes: true,
        commentVotes: true,
        subscriptions: true,
        moderatorAssignments: true,
        bans: true,
        issuedBans: true,
        filedReports: true,
        resolvedReports: true,
      },
    } satisfies Prisma.reddit_community_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityMember.ISummary> {
    return {
      id: input.id,
      username: input.username,
      display_name: input.display_name,
      bio: input.bio,
      avatar: input.avatar,
      karma: input.karma,
      created_at: input.created_at.toISOString(),
    } satisfies IRedditCommunityMember.ISummary;
  }
}
