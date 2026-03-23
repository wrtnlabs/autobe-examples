import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeBan";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeCommunityAtSummaryTransformer } from "./RedditLikeCommunityAtSummaryTransformer";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";

export namespace RedditLikeBanAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        bannedUser: RedditLikeMemberAtSummaryTransformer.select(),
        bannedCommunity: RedditLikeCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeBan.ISummary> {
    return {
      id: input.id,
      status: input.status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      bannedUser: await RedditLikeMemberAtSummaryTransformer.transform(
        input.bannedUser,
      ),
      bannedCommunity: await RedditLikeCommunityAtSummaryTransformer.transform(
        input.bannedCommunity,
      ),
    };
  }
}
