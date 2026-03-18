import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformMemberAtSummaryTransformer {
  export type Payload = Prisma.community_platform_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        userProfile: true,
        ownedCommunities: true,
        communitySubscriptions: true,
        moderatedCommunities: true,
        posts: true,
        editedPosts: true,
        deletedPosts: true,
        comments: true,
        editedComments: true,
        deletedComments: true,
        commentVotes: true,
        postVotes: true,
        reports: true,
        reviewedReportSnapshots: true,
        reportResolutions: true,
        communityBans: true,
        appliedCommunityBans: true,
        communityBanSnapshots: true,
        appliedCommunityBanSnapshots: true,
      },
    } satisfies Prisma.community_platform_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformMember.ISummary> {
    if (input.deleted_at !== null) {
      throw new Error(
        "Cannot transform a soft-deleted community member into ICommunityPlatformMember.ISummary.",
      );
    }
    return {
      id: input.id as unknown as ICommunityPlatformMember.ISummary["id"],
      display_name: `Member ${input.id}`,
      bio: null,
      avatar_uri: null,
    };
  }
}
