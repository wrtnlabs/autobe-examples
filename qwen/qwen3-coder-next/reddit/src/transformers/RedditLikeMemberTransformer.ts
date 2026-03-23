import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikeMemberTransformer {
  export type Payload = Prisma.reddit_like_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        username: true,
        password_hash: true,
        display_name: true,
        bio: true,
        avatar_url: true,
        karma_score: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        passwordResets: true,
        emailVerification: true,
        ownedCommunity: true,
        posts: true,
        postSnapshots: true,
        postVotes: true,
        comments: true,
        commentVotes: true,
        subscriptions: true,
        moderatorRoles: true,
        reports: true,
        communityBans: true,
      },
    } satisfies Prisma.reddit_like_membersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IRedditLikeMember> {
    return {
      id: input.id,
      email: input.email,
      username: input.username,
      display_name: input.display_name,
      bio: input.bio ?? undefined,
      avatar_url: input.avatar_url ?? undefined,
      karma_score: input.karma_score,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at?.toISOString() ?? undefined,
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
