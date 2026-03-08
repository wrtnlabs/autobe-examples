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

export async function putCommunityPlatformMemberCommunitiesCommunityName(props: {
  member: MemberPayload;
  communityName: string;
  body: ICommunityPlatformCommunity.IUpdate;
}): Promise<ICommunityPlatformCommunity> {
  // Find community by name
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
      select: {
        id: true,
        owner_id: true,
        name: true,
      },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Check authorization: owner or moderator
  const isOwner = community.owner_id === props.member.id;
  if (!isOwner) {
    const moderator =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_id: community.id,
          member_id: props.member.id,
          deleted_at: null,
        },
      });
    if (!moderator) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // If changing name, check uniqueness (case-insensitive)
  if (props.body.name !== undefined) {
    const normalizedName = props.body.name.toLowerCase();
    if (normalizedName !== community.name.toLowerCase()) {
      const existingCommunity =
        await MyGlobal.prisma.community_platform_communities.findFirst({
          where: {
            name: { equals: props.body.name, mode: "insensitive" },
            id: { not: community.id },
            deleted_at: null,
          },
        });
      if (existingCommunity) {
        throw new HttpException("Community name already exists", 409);
      }
    }
  }
  // Update and return
  const updated = await MyGlobal.prisma.community_platform_communities.update({
    where: { id: community.id },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.icon !== undefined && { icon: props.body.icon }),
      updated_at: new Date(),
    },
    ...CommunityPlatformCommunityTransformer.select(),
  });
  return await CommunityPlatformCommunityTransformer.transform(updated);
}
