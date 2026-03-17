import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformCommunityBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanSnapshot";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityBanSnapshotTransformer } from "../transformers/CommunityPlatformCommunityBanSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminCommunitiesCommunityIdBansBanIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityBanSnapshot> {
  const admin =
    await MyGlobal.prisma.community_platform_admins.findUniqueOrThrow({
      where: { id: props.admin.id },
      select: {
        id: true,
        email: true,
        status: true,
        deleted_at: true,
      },
    });
  if (admin.deleted_at !== null || admin.status !== "active") {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.community_platform_communities.findFirstOrThrow({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
    select: { id: true },
  });
  const member =
    await MyGlobal.prisma.community_platform_members.findFirstOrThrow({
      where: {
        email: admin.email,
        deleted_at: null,
        status: "active",
      },
      select: {
        id: true,
      },
    });
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: member.id,
        status: "active",
        deleted_at: null,
        revoked_at: null,
      },
      select: {
        id: true,
      },
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  const snapshot =
    await MyGlobal.prisma.community_platform_community_ban_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.snapshotId,
          community_platform_community_ban_id: props.banId,
          communityBan: {
            id: props.banId,
            community_platform_community_id: props.communityId,
            deleted_at: null,
            community: {
              id: props.communityId,
              deleted_at: null,
            },
          },
        },
        ...CommunityPlatformCommunityBanSnapshotTransformer.select(),
      },
    );
  return await CommunityPlatformCommunityBanSnapshotTransformer.transform(
    snapshot,
  );
}
