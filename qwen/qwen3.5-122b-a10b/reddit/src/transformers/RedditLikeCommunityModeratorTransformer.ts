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

export namespace RedditLikeCommunityModeratorTransformer {
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
        community: RedditLikeCommunityAtSummaryTransformer.select(),
        member: RedditLikeMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_community_moderatorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeCommunityModerator> {
    return {
      id: input.id,
      community: await RedditLikeCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      member: await RedditLikeMemberAtSummaryTransformer.transform(
        input.member,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IRedditLikeCommunityModerator;
  }
}
