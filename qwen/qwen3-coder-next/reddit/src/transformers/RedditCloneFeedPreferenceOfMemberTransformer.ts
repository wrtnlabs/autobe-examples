import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFeedPreferenceOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFeedPreferenceOfMember";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditCloneFeedPreferenceOfMemberTransformer {
  export type Payload =
    Prisma.reddit_clone_feed_preference_of_membersGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        feed_preference_id: true,
        member_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
          },
        } satisfies Prisma.reddit_clone_membersFindFirstArgs,
      },
    } satisfies Prisma.reddit_clone_feed_preference_of_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneFeedPreferenceOfMember> {
    return {
      id: input.id,
      feed_preference_id: input.feed_preference_id,
      member_id: input.member_id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      member: await RedditCloneMemberAtSummaryTransformer.transform(
        input.member,
      ),
    };
  }
}
