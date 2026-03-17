import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminCommunitiesCommunityIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  communityId: string;
  snapshotId: string;
}): Promise<ICommunityPlatformCommunitySnapshot> {
  // Verify the community exists (admin can access any community)
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirstOrThrow({
      where: { id: props.communityId, deleted_at: null },
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        ownerMember: {
          select: {
            id: true,
            email: true,
            username: true,
            nickname: true,
            email_verified: true,
            registered_at: true,
            last_login_at: true,
          },
        },
        subscriberCount: {
          select: { subscriber_count: true },
        } satisfies Prisma.community_platform_mv_community_subscriber_countsFindManyArgs,
      },
    });
  // Retrieve snapshot without invalid join properties
  const snapshot =
    await MyGlobal.prisma.community_platform_community_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.snapshotId,
          community_platform_community_id: props.communityId,
        },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          type: true,
          status: true,
          visibility: true,
          is_nsfw: true,
          is_archived: true,
          is_locked: true,
          member_count: true,
          subscriber_count: true,
          post_count: true,
          comment_count: true,
          created_at: true,
        },
      },
    );
  // Transform to DTO
  return {
    id: snapshot.id as string & tags.Format<"uuid">,
    code: snapshot.code,
    name: snapshot.name,
    description: snapshot.description ?? null,
    type: snapshot.type,
    status: snapshot.status,
    visibility: snapshot.visibility,
    is_nsfw: snapshot.is_nsfw,
    is_archived: snapshot.is_archived,
    is_locked: snapshot.is_locked,
    member_count: snapshot.member_count,
    subscriber_count: snapshot.subscriber_count,
    post_count: snapshot.post_count,
    comment_count: snapshot.comment_count,
    created_at: toISOStringSafe(snapshot.created_at),
    // Transform community from separate query
    community: {
      id: community.id,
      name: community.name,
      description: community.description ?? null,
      created_at: toISOStringSafe(community.created_at),
      owner: {
        id: community.ownerMember.id,
        email: community.ownerMember.email,
        username: community.ownerMember.username,
        nickname: community.ownerMember.nickname ?? undefined,
        email_verified: community.ownerMember.email_verified,
        registered_at: toISOStringSafe(community.ownerMember.registered_at),
        last_login_at: community.ownerMember.last_login_at
          ? toISOStringSafe(community.ownerMember.last_login_at)
          : undefined,
      } satisfies ICommunityPlatformMember.ISummary,
      subscriber_count: community.subscriberCount?.subscriber_count ?? 0,
    } satisfies ICommunityPlatformCommunity.ISummary,
    // Owner member from the community query (same as above)
    owner: {
      id: community.ownerMember.id,
      email: community.ownerMember.email,
      username: community.ownerMember.username,
      nickname: community.ownerMember.nickname ?? undefined,
      email_verified: community.ownerMember.email_verified,
      registered_at: toISOStringSafe(community.ownerMember.registered_at),
      last_login_at: community.ownerMember.last_login_at
        ? toISOStringSafe(community.ownerMember.last_login_at)
        : undefined,
    } satisfies ICommunityPlatformMember.ISummary,
  };
}
