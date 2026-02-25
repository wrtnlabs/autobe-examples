import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
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

export async function putCommunityMemberCommunitiesCommunityName(props: {
  member: MemberPayload;
  communityName: string;
  body: ICommunityCommunity.IUpdate;
}): Promise<ICommunityCommunity> {
  // Find community by name and verify not soft-deleted
  const community = await MyGlobal.prisma.community_communities.findFirst({
    where: {
      name: props.communityName,
      deleted_at: null,
    },
    select: {
      id: true,
      owner_id: true,
    },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Verify ownership - only owner can update community settings
  if (community.owner_id !== props.member.id) {
    throw new HttpException(
      "Only the community owner can modify community settings",
      403,
    );
  }
  // Perform partial update with only provided fields
  const updated = await MyGlobal.prisma.community_communities.update({
    where: { id: community.id },
    data: {
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.icon_url !== undefined && {
        icon_url: props.body.icon_url,
      }),
      updated_at: new Date(),
    },
    ...CommunityCommunityTransformer.select(),
  });
  return await CommunityCommunityTransformer.transform(updated);
}
