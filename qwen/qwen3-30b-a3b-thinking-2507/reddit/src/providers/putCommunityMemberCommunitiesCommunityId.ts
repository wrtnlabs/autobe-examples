import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityCommunityTransformer } from "../transformers/CommunityCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityMemberCommunitiesCommunityId(props: {
  member: MemberPayload;
  communityId: string;
  body: ICommunityCommunity.IUpdate;
}): Promise<ICommunityCommunity> {
  const { member, communityId, body } = props;
  // Check community exists and is owned by member
  const community = await MyGlobal.prisma.community_communities.findUnique({
    where: { id: communityId },
  });
  if (!community) throw new HttpException("Community not found", 404);
  if (community.owner_id !== member.id)
    throw new HttpException("Forbidden", 403);
  // Validate name length if provided
  if (
    body.name !== undefined &&
    (body.name.length < 3 || body.name.length > 30)
  ) {
    throw new HttpException("Name must be 3-30 characters", 400);
  }
  // Check for name uniqueness (ignoring the current community)
  if (body.name !== undefined) {
    const existing = await MyGlobal.prisma.community_communities.findFirst({
      where: {
        name: body.name,
        id: { not: communityId },
      },
    });
    if (existing) throw new HttpException("Community name already exists", 400);
  }
  // Build update payload with only provided fields
  const updateData: Record<string, any> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.icon_url !== undefined) updateData.icon_url = body.icon_url;
  // Execute update with transformer-selected fields
  const updated = await MyGlobal.prisma.community_communities.update({
    where: { id: communityId },
    data: updateData,
    ...CommunityCommunityTransformer.select(),
  });
  return CommunityCommunityTransformer.transform(updated);
}
