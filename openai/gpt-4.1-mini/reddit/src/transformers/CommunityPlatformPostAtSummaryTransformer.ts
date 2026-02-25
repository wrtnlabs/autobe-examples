import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformPostAtSummaryTransformer {
  export type Payload = Prisma.community_platform_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        post_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        authorUser: CommunityPlatformUserAtSummaryTransformer.select(),
        authorModerator: true, // No transformer exists for authorModerator, select true
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        reports: { select: { id: true } },
        postSnapshots: { select: { id: true } },
        postTexts: { select: { id: true } },
        postImages: { select: { id: true } },
        postVotes: { select: { id: true } },
        postLink: { select: { id: true } },
        postComments: { select: { id: true } },
        postReports: { select: { id: true } },
        moderationLogs: { select: { id: true } },
        comments: { select: { id: true } },
        deletionRecords: { select: { id: true } },
      },
    } satisfies Prisma.community_platform_postsFindManyArgs;
  }
  export async function transform(
    prisma: Payload,
  ): Promise<ICommunityPlatformPost.ISummary> {
    return {
      id: prisma.id,
      title: prisma.title,
      postType: prisma.post_type,
      createdAt: prisma.created_at.toISOString(),
      updatedAt: prisma.updated_at.toISOString(),
      deletedAt: prisma.deleted_at?.toISOString() ?? null,
      authorUser: prisma.authorUser
        ? await CommunityPlatformUserAtSummaryTransformer.transform(
            prisma.authorUser,
          )
        : null,
      authorModerator: null, // No data available, always null
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        prisma.community,
      ),
      voteScore: prisma.postVotes.length,
      commentCount: prisma.postComments.length,
    };
  }
}
