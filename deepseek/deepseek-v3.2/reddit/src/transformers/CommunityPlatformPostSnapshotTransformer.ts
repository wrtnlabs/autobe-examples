import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformMemberAtSummaryTransformer } from "./CommunityPlatformMemberAtSummaryTransformer";
import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";

export namespace CommunityPlatformPostSnapshotTransformer {
  export type Payload = Prisma.community_platform_post_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        snapshot_title: true,
        snapshot_content_type: true,
        snapshot_created_at: true,
        snapshot_updated_at: true,
        snapshot_deleted_at: true,
        created_at: true,
        updated_at: true,
        post: CommunityPlatformPostAtSummaryTransformer.select(),
        // Need to join member data using foreign key
        snapshotMember: {
          select: {
            id: true,
            email: true,
            username: true,
            nickname: true,
            email_verified: true,
            registered_at: true,
            last_login_at: true,
          },
        } satisfies Prisma.community_platform_membersFindManyArgs,
        // Need to join community data using foreign key
        snapshotCommunity: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            ownerMember: CommunityPlatformMemberAtSummaryTransformer.select(),
            subscriberCount: {
              select: {
                subscriber_count: true,
              },
            } satisfies Prisma.community_platform_mv_community_subscriber_countsFindManyArgs,
          },
        } satisfies Prisma.community_platform_communitiesFindManyArgs,
      },
    } satisfies Prisma.community_platform_post_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformPostSnapshot> {
    const [author, community, post] = await Promise.all([
      CommunityPlatformMemberAtSummaryTransformer.transform(
        input.snapshotMember,
      ),
      CommunityPlatformCommunityAtSummaryTransformer.transform(
        input.snapshotCommunity,
      ),
      CommunityPlatformPostAtSummaryTransformer.transform(input.post),
    ]);
    return {
      id: input.id,
      snapshot_title: input.snapshot_title,
      snapshot_content_type: input.snapshot_content_type as
        | "text"
        | "link"
        | "image",
      snapshot_created_at: toISOStringSafe(input.snapshot_created_at),
      snapshot_updated_at: input.snapshot_updated_at
        ? toISOStringSafe(input.snapshot_updated_at)
        : null,
      snapshot_deleted_at: input.snapshot_deleted_at
        ? toISOStringSafe(input.snapshot_deleted_at)
        : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      author,
      community,
      post,
    };
  }
}
