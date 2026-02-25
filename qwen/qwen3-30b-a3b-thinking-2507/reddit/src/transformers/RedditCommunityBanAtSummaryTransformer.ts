import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityAtSummaryTransformer } from "./RedditCommunityAtSummaryTransformer";
import { RedditProfileAtSummaryTransformer } from "./RedditProfileAtSummaryTransformer";

export namespace RedditCommunityBanAtSummaryTransformer {
  export type Payload = Prisma.reddit_community_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        community: RedditCommunityAtSummaryTransformer.select(),
        user: RedditProfileAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_community_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityBan.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      created_at: input.created_at.toISOString(),
      community: await RedditCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      user: await RedditProfileAtSummaryTransformer.transform(input.user),
    };
  }
}
