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
import { CommunityPlatformCommunitySnapshotCollector } from "../collectors/CommunityPlatformCommunitySnapshotCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminCommunityIdSnapshots(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunitySnapshot.ICreate;
}): Promise<ICommunityPlatformCommunitySnapshot> {
  // Verify community exists and is active
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
        owner_member_id: true,
      },
    });
  // Check authorization - only community owners or platform admins can create snapshots
  // Since this is an admin endpoint, we trust the admin authorization
  // Prepare community entity for collector
  const communityEntity: IEntity = {
    id: props.communityId,
  };
  // Create snapshot using collector
  const snapshot =
    await MyGlobal.prisma.community_platform_community_snapshots.create({
      data: await CommunityPlatformCommunitySnapshotCollector.collect({
        body: props.body,
        community: communityEntity,
      }),
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
        owner_member_id: true,
        community_platform_community_id: true,
        created_at: true,
      },
    });
  // Fetch owner member for the snapshot
  const owner =
    await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
      where: { id: snapshot.owner_member_id },
      select: {
        id: true,
        email: true,
        username: true,
        nickname: true,
        email_verified: true,
        registered_at: true,
        last_login_at: true,
      },
    });
  // Fetch community for the snapshot (summary)
  const snapshotCommunity =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: snapshot.community_platform_community_id },
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
        owner_member_id: true,
      },
    });
  // Fetch community owner for summary
  const communityOwner =
    await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
      where: { id: snapshotCommunity.owner_member_id },
      select: {
        id: true,
        email: true,
        username: true,
        nickname: true,
        email_verified: true,
        registered_at: true,
        last_login_at: true,
      },
    });
  // Get subscriber count for community summary
  const subscriberCount =
    await MyGlobal.prisma.community_platform_mv_community_subscriber_counts.findUnique(
      {
        where: { community_id: snapshot.community_platform_community_id },
        select: { subscriber_count: true },
      },
    );
  // Construct and return the response
  return {
    id: snapshot.id,
    code: snapshot.code,
    name: snapshot.name,
    description: snapshot.description,
    type: snapshot.type,
    status: snapshot.status,
    visibility: snapshot.visibility,
    is_nsfw: snapshot.is_nsfw,
    is_archived: snapshot.is_archived,
    is_locked: snapshot.is_locked,
    member_count: snapshot.member_count satisfies number as number,
    subscriber_count: snapshot.subscriber_count satisfies number as number,
    post_count: snapshot.post_count satisfies number as number,
    comment_count: snapshot.comment_count satisfies number as number,
    owner: {
      id: owner.id,
      email: owner.email,
      username: owner.username,
      nickname: owner.nickname ?? undefined,
      email_verified: owner.email_verified,
      registered_at: owner.registered_at.toISOString(),
      last_login_at: owner.last_login_at?.toISOString() ?? undefined,
    } satisfies ICommunityPlatformMember.ISummary,
    created_at: snapshot.created_at.toISOString(),
    community: {
      id: snapshotCommunity.id,
      name: snapshotCommunity.name,
      description: snapshotCommunity.description,
      created_at: snapshotCommunity.created_at.toISOString(),
      owner: {
        id: communityOwner.id,
        email: communityOwner.email,
        username: communityOwner.username,
        nickname: communityOwner.nickname ?? undefined,
        email_verified: communityOwner.email_verified,
        registered_at: communityOwner.registered_at.toISOString(),
        last_login_at: communityOwner.last_login_at?.toISOString() ?? undefined,
      } satisfies ICommunityPlatformMember.ISummary,
      subscriber_count: (subscriberCount?.subscriber_count ??
        0) satisfies number as number,
    } satisfies ICommunityPlatformCommunity.ISummary,
  } satisfies ICommunityPlatformCommunitySnapshot;
}
