import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformBanTransformer } from "../transformers/CommunityPlatformBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberCommunityIdBansBanId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
  body: ICommunityPlatformBan.IUpdate;
}): Promise<ICommunityPlatformBan> {
  // Import the transformer (already available in scope)
  // Using CommunityPlatformBanTransformer imported from '../transformers/CommunityPlatformBanTransformer';

  // 1. Validate community exists
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  // 2. Verify ban exists and belongs to the specified community
  const existingBan =
    await MyGlobal.prisma.community_platform_bans.findUniqueOrThrow({
      where: { id: props.banId },
      select: { community_id: true },
    });
  if (existingBan.community_id !== props.communityId) {
    throw new HttpException("Ban does not belong to specified community", 400);
  }
  // 3. Check if requesting member is a moderator for this community
  const moderationRole =
    await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
      where: {
        community: { id: props.communityId },
        member: { id: props.member.id }, // Changed from member_id to member.id
        deleted_at: null,
      },
    });
  if (!moderationRole) {
    throw new HttpException(
      "You must be a moderator of this community to update bans",
      403,
    );
  }
  // 4. Validate expires_at is in the future if provided
  if (props.body.expires_at !== undefined && props.body.expires_at !== null) {
    // Compare ISO strings directly - expiry must be after current time
    const expiryTime = new Date(props.body.expires_at).getTime();
    const currentTime = Date.now();
    if (expiryTime <= currentTime) {
      throw new HttpException("Expiry date must be in the future", 400);
    }
  }
  // 5. Prepare update data
  const updateData: Prisma.community_platform_bansUpdateArgs["data"] = {
    updated_at: toISOStringSafe(new Date()),
  };
  // Set fields from body if provided
  if (props.body.reason !== undefined) {
    updateData.reason = props.body.reason;
  }
  if (props.body.expires_at !== undefined) {
    updateData.expires_at =
      props.body.expires_at === null ? null : props.body.expires_at;
  }
  if (props.body.active !== undefined) {
    updateData.active = props.body.active;
    // If deactivating (unbanning), set unbanned_at timestamp
    if (props.body.active === false) {
      updateData.unbanned_at = toISOStringSafe(new Date());
    }
  }
  // 6. Update the ban record
  await MyGlobal.prisma.community_platform_bans.update({
    where: { id: props.banId },
    data: updateData,
  });
  // 7. Fetch updated ban with full relations
  const updatedBan =
    await MyGlobal.prisma.community_platform_bans.findUniqueOrThrow({
      where: { id: props.banId },
      ...CommunityPlatformBanTransformer.select(),
    });
  // 8. Transform and return
  return await CommunityPlatformBanTransformer.transform(updatedBan);
}
