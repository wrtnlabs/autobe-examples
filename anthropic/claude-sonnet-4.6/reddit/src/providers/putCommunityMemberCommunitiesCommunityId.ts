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

export async function putCommunityMemberCommunitiesCommunityId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityCommunity.IUpdate;
}): Promise<ICommunityCommunity> {
  // Step 1: Verify the community exists and is not deleted
  await MyGlobal.prisma.community_communities.findFirstOrThrow({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 2: Authorization - check requesting member is the community owner
  const ownerRecord = await MyGlobal.prisma.community_moderators.findFirst({
    where: {
      community_id: props.communityId,
      member_id: props.member.id,
      role: "owner",
    },
    select: { id: true },
  });
  if (ownerRecord === null) {
    throw new HttpException(
      "Forbidden: Only the community owner can update community metadata.",
      403,
    );
  }
  // Step 3: Name uniqueness check - ensure no other active community shares the same name
  const nameConflict = await MyGlobal.prisma.community_communities.findFirst({
    where: {
      name: props.body.name,
      id: { not: props.communityId },
      deleted_at: null,
    },
    select: { id: true },
  });
  if (nameConflict !== null) {
    throw new HttpException("Conflict: Community name is already taken.", 409);
  }
  // Step 4: Perform the update on community metadata
  await MyGlobal.prisma.community_communities.update({
    where: { id: props.communityId },
    data: {
      name: props.body.name,
      description:
        props.body.description !== undefined ? props.body.description : null,
      icon_url: props.body.icon_url !== undefined ? props.body.icon_url : null,
      updated_at: new Date(),
    },
  });
  // Step 5: Fetch and return the fully updated community record via transformer
  const updated = await MyGlobal.prisma.community_communities.findUniqueOrThrow(
    {
      where: { id: props.communityId },
      ...CommunityCommunityTransformer.select(),
    },
  );
  return await CommunityCommunityTransformer.transform(updated);
}
