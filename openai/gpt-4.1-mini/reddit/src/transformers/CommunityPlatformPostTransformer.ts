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
import { CommunityPlatformCommunityModeratorTransformer } from "./CommunityPlatformCommunityModeratorTransformer";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformPostTransformer {
  export type Payload = Prisma.community_platform_postsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        community_id: true,
        author_user_id: true,
        author_moderator_id: true,
        title: true,
        post_type: true,
        authorUser: CommunityPlatformUserAtSummaryTransformer.select(),
        authorModerator:
          CommunityPlatformCommunityModeratorTransformer.select(),
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        postVotes: true,
        postComments: { select: { id: true } },
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reports: { select: { id: true } },
        postSnapshots: { select: { id: true } },
        postTexts: { select: { id: true } },
        postImages: { select: { id: true } },
        postLink: { select: { id: true } },
        postReports: { select: { id: true } },
        moderationLogs: { select: { id: true } },
        comments: { select: { id: true } },
        deletionRecords: { select: { id: true } },
      },
    } satisfies Prisma.community_platform_postsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPost> {
    return {
      id: input.id,
      communityId: input.community_id,
      authorUserId: input.author_user_id ?? undefined,
      authorModeratorId: input.author_moderator_id ?? undefined,
      title: input.title,
      postType: typia.assert<"text" | "link" | "image">(input.post_type),
      authorUser: input.authorUser
        ? await CommunityPlatformUserAtSummaryTransformer.transform(
            input.authorUser,
          )
        : null,
      authorModerator: input.authorModerator
        ? await CommunityPlatformCommunityModeratorTransformer.transform(
            input.authorModerator,
          )
        : null,
      community: await CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      voteCount: input.postVotes.reduce((sum, v) => {
        return (
          sum + (typeof (v as any).vote === "number" ? (v as any).vote : 0)
        );
      }, 0),
      commentCount: input.postComments.length,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
