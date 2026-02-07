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

export async function putCommunityPlatformMemberCommunitiesCommunityId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunity.IUpdate;
}): Promise<ICommunityPlatformCommunity> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: props.communityId },
      include: { owner: true },
    });
  if (!community) throw new HttpException("Community not found", 404);
  if (community.owner_id !== props.member.id) {
    throw new HttpException(
      "Unauthorized: Only community owner can update",
      403,
    );
  }
  if (props.body.name !== undefined) {
    const existing =
      await MyGlobal.prisma.community_platform_communities.findFirst({
        where: {
          name: props.body.name,
          id: { not: props.communityId },
        },
      });
    if (existing) {
      throw new HttpException("Community name already exists", 409);
    }
  }
  const updateData: Prisma.community_platform_communitiesUpdateInput = {};
  if (props.body.name !== undefined) updateData.name = props.body.name;
  if (props.body.description !== undefined)
    updateData.description = props.body.description;
  if (props.body.icon_url !== undefined)
    updateData.icon_url = props.body.icon_url;
  updateData.updated_at = toISOStringSafe(new Date());
  const updatedCommunity =
    await MyGlobal.prisma.community_platform_communities.update({
      where: { id: props.communityId },
      data: updateData,
      include: { owner: true },
    });
  return await CommunityPlatformCommunityTransformer.transform(
    updatedCommunity,
  );
}
