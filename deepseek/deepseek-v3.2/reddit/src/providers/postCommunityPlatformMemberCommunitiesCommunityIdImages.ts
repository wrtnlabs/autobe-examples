import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityImageCollector } from "../collectors/CommunityPlatformCommunityImageCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunityImageTransformer } from "../transformers/CommunityPlatformCommunityImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberCommunitiesCommunityIdImages(props: {
  member: MemberPayload;
  communityId: string;
  body: ICommunityPlatformCommunityImage.ICreate;
}): Promise<ICommunityPlatformCommunityImage> {
  // Verify community exists
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { id: true, owner_member_id: true },
    });
  // Check ownership
  if (community.owner_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Deactivate other images if this one is active
  if (props.body.active) {
    await MyGlobal.prisma.community_platform_community_images.updateMany({
      where: {
        community_id: props.communityId,
        active: true,
        deleted_at: null,
      },
      data: {
        active: false,
        updated_at: new Date().toISOString(),
      },
    });
  }
  // Create the image record using collector
  const created =
    await MyGlobal.prisma.community_platform_community_images.create({
      data: await CommunityPlatformCommunityImageCollector.collect({
        body: props.body,
        community: { id: props.communityId },
      }),
      ...CommunityPlatformCommunityImageTransformer.select(),
    });
  // Transform to response DTO
  return await CommunityPlatformCommunityImageTransformer.transform(created);
}
