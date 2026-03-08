import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeCommunityAtSummaryTransformer } from "./RedditLikeCommunityAtSummaryTransformer";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";

export namespace RedditLikeModeratorRoleAtConductTransformer {
  export type Payload = Prisma.reddit_like_moderator_rolesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        role: true,
        created_at: true,
        user: RedditLikeMemberAtSummaryTransformer.select(),
        community: RedditLikeCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_moderator_rolesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeModeratorRole.IConduct> {
    return {
      id: input.id,
      user: await RedditLikeMemberAtSummaryTransformer.transform(input.user),
      community: await RedditLikeCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      role: input.role as "owner" | "moderator",
      created_at: input.created_at.toISOString(),
      ban_count: 0,
      report_count: 0,
      average_handling_time_minutes: 0,
    };
  }
}
