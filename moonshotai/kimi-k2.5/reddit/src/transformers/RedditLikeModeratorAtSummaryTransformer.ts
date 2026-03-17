import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditLikeCommunityAtSummaryTransformer } from "./RedditLikeCommunityAtSummaryTransformer";
import { RedditLikeMemberAtSummaryTransformer } from "./RedditLikeMemberAtSummaryTransformer";

export namespace RedditLikeModeratorAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_moderatorsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        can_add_moderators: true,
        created_at: true,
        member: RedditLikeMemberAtSummaryTransformer.select(),
        community: RedditLikeCommunityAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_like_moderatorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeModerator.ISummary> {
    return {
      id: input.id,
      canAddModerators: input.can_add_moderators,
      createdAt: input.created_at.toISOString(),
      member: await RedditLikeMemberAtSummaryTransformer.transform(
        input.member,
      ),
      community: await RedditLikeCommunityAtSummaryTransformer.transform(
        input.community,
      ),
    };
  }
}
