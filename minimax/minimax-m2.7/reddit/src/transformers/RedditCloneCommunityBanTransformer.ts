import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneMemberSessionAtSummaryTransformer } from "./RedditCloneMemberSessionAtSummaryTransformer";

export namespace RedditCloneCommunityBanTransformer {
  export type Payload = Prisma.reddit_clone_communitiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        subscriber_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: RedditCloneMemberSessionAtSummaryTransformer.select(),
        icon: true,
        posts: {
          select: {
            _count: {
              select: { comments: true },
            },
          },
        } satisfies Prisma.reddit_clone_postsFindManyArgs,
        communityModerators: {
          select: {
            _count: true,
          },
        } satisfies Prisma.reddit_clone_community_moderatorsFindManyArgs,
        communityBans: true,
        communityReports: true,
        subscriptions: true,
        moderators: true,
        moderatorSnapshots: true,
        bans: true,
        reports: true,
      },
    } satisfies Prisma.reddit_clone_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneCommunityBan> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      subscriber_count: input.subscriber_count,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at:
        input.deleted_at != null ? toISOStringSafe(input.deleted_at) : null,
      owner: await RedditCloneMemberSessionAtSummaryTransformer.transform(
        input.member,
      ),
      posts_count: input.posts.length,
      comments_count: input.posts.reduce(
        (sum, p) => sum + (p._count?.comments ?? 0),
        0,
      ),
      moderators_count: input.communityModerators.length,
    };
  }
}
