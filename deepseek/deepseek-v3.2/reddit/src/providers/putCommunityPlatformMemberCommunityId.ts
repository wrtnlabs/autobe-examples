import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunityTransformer } from "../transformers/CommunityPlatformCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberCommunityId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunity.IUpdate;
}): Promise<ICommunityPlatformCommunity> {
  // 1. Verify community exists and member is owner
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
        deleted_at: null, // Cannot update soft-deleted communities
      },
      select: {
        id: true,
        owner_member_id: true,
      },
    });
  // 2. Check ownership
  if (community.owner_member_id !== props.member.id) {
    throw new HttpException(
      "Only community owner can update community metadata",
      403,
    );
  }
  // 3. Validate name uniqueness if name is being updated
  if (props.body.name !== undefined) {
    const existingCommunity =
      await MyGlobal.prisma.community_platform_communities.findFirst({
        where: {
          name: props.body.name,
          id: { not: props.communityId }, // Exclude current community
          deleted_at: null,
        },
        select: { id: true },
      });
    if (existingCommunity !== null) {
      throw new HttpException("Community name already exists", 400);
    }
  }
  // 4. Build update data with proper type
  const updateData: Prisma.community_platform_communitiesUpdateInput = {};
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  // Always update updated_at with ISO string
  updateData.updated_at = new Date().toISOString();
  // 5. Update community
  await MyGlobal.prisma.community_platform_communities.update({
    where: { id: props.communityId },
    data: updateData,
  });
  // 6. Fetch and return updated community using transformer
  const updated =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      ...CommunityPlatformCommunityTransformer.select(),
    });
  return await CommunityPlatformCommunityTransformer.transform(updated);
}
