import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityModerator";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeCommunityAtSummaryTransformer } from "./RedditLikeCommunityAtSummaryTransformer";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";

export namespace RedditLikeCommunityModeratorAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_community_moderatorsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: RedditLikeMemberAtSummaryTransformer.select(),
        community: RedditLikeCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_community_moderatorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeCommunityModerator.ISummary> {
    return {
      id: input.id,
      member: await RedditLikeMemberAtSummaryTransformer.transform(
        input.member,
      ),
      community: await RedditLikeCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      created_at: input.created_at.toISOString(),
    } satisfies IRedditLikeCommunityModerator.ISummary;
  }
}
