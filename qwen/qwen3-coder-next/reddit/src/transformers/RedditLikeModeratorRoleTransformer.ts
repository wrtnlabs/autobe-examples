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

export namespace RedditLikeModeratorRoleTransformer {
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
  ): Promise<IRedditLikeModeratorRole> {
    return {
      id: input.id,
      role: typia.assert<"owner" | "moderator">(input.role),
      created_at: toISOStringSafe(input.created_at),
      user: await RedditLikeMemberAtSummaryTransformer.transform(input.user),
      community: await RedditLikeCommunityAtSummaryTransformer.transform(
        input.community,
      ),
    };
  }
}
