import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCommunityMemberAtSummaryTransformer } from "./RedditCommunityMemberAtSummaryTransformer";

export namespace RedditCommunityCommunityTransformer {
  export type Payload = Prisma.reddit_community_communitiesGetPayload<
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
        owner: RedditCommunityMemberAtSummaryTransformer.select(),
        subscriptions: {
          select: {
            id: true,
            member: true,
            created_at: true,
          },
        },
        moderators: {
          select: {
            id: true,
            created_at: true,
          },
        },
        bans: {
          select: {
            id: true,
            created_at: true,
          },
        },
        posts: {
          select: {
            id: true,
            title: true,
            created_at: true,
          },
        },
        reports: {
          select: {
            id: true,
            reason: true,
            status: true,
          },
        },
        homeFeedCaches: {
          select: {
            id: true,
            created_at: true,
          },
        },
        iconFiles: {
          select: {
            id: true,
            file_id: true,
          },
        },
        systemLogs: {
          select: {
            id: true,
            created_at: true,
          },
        },
      },
    } satisfies Prisma.reddit_community_communitiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCommunityCommunity> {
    return {
      id: input.id,
      name: input.name,
      description: input.description ?? undefined,
      subscriber_count: input.subscriber_count,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      owner: await RedditCommunityMemberAtSummaryTransformer.transform(
        input.owner,
      ),
    };
  }
}
