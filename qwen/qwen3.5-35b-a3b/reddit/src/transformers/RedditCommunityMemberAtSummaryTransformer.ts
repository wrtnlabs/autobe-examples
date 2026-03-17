import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditCommunityMemberAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        username: true,
        created_at: true,
        karma: {
          select: {
            current_score: true,
          },
        },
      },
    } satisfies Prisma.reddit_community_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityMember.ISummary> {
    const karma = input.karma?.current_score
      ? Number(input.karma.current_score)
      : undefined;
    return {
      id: input.id,
      username: input.username,
      created_at: toISOStringSafe(input.created_at),
      profile: undefined,
      karma: karma,
    } satisfies IRedditCommunityMember.ISummary;
  }
}
