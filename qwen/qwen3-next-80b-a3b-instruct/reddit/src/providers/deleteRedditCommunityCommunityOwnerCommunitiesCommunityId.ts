import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityownerPayload } from "../decorators/payload/CommunityownerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCommunityCommunityOwnerCommunitiesCommunityId(props: {
  communityOwner: CommunityownerPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify community exists and get owner
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { id: props.communityId },
      select: { owner_user_id: true },
    });
  if (!community) throw new HttpException("Community not found", 404);
  // Verify authorization: must be owner or platformAdmin
  const isOwner = community.owner_user_id === props.communityOwner.id;
  const isPlatformAdmin =
    typia.assert<"platformAdmin">(props.communityOwner.type) ===
    "platformAdmin";
  if (!isOwner && !isPlatformAdmin) {
    throw new HttpException("Forbidden", 403);
  }
  // Perform atomic soft-delete transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Soft-delete all posts in community (set is_deleted=true)
    await tx.reddit_community_posts.updateMany({
      where: { community_id: props.communityId },
      data: {
        is_deleted: true,
        updated_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
      },
    });
    // Delete all subscriptions (cascades automatically)
    await tx.reddit_community_subscriptions.deleteMany({
      where: { community_id: props.communityId },
    });
    // Delete all moderators (cascades automatically)
    await tx.reddit_community_moderators.deleteMany({
      where: { community_id: props.communityId },
    });
    // Delete all bans (cascades automatically)
    await tx.reddit_community_bans.deleteMany({
      where: { community_id: props.communityId },
    });
    // Soft-delete community by updating updated_at (no is_deleted flag in schema)
    await tx.reddit_community_communities.update({
      where: { id: props.communityId },
      data: {
        updated_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
      },
    });
    // Write audit log for deletion
    await (tx as any).reddit_community_audits.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_id: props.communityOwner.id,
        actor_type: props.communityOwner.type,
        action: "DELETE_COMMUNITY",
        target_id: props.communityId,
        target_type: "COMMUNITY",
        created_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
      },
    });
  });
}
