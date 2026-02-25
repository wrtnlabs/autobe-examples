import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditMemberAtSummaryTransformer {
  export type Payload = Prisma.reddit_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        passwordResets: true,
        emailVerifications: true,
        profile: true,
        communities: true,
        subscriptions: true,
        posts: true,
        postVotes: true,
        commentVotes: true,
        reports: true,
        resolutions: true,
        feedPreferences: true,
        viewStats: true,
      },
    } satisfies Prisma.reddit_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditMember.ISummary> {
    return {
      id: input.id,
      email: input.email,
      created_at: input.created_at.toISOString(),
    };
  }
}
