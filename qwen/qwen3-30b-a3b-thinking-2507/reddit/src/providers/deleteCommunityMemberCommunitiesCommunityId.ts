import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityMemberCommunitiesCommunityId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<void> {
  const community = await MyGlobal.prisma.community_communities.findUnique({
    where: { id: props.communityId },
  });
  if (!community) throw new HttpException("Community not found", 404);
  const isOwner = await MyGlobal.prisma.community_moderators.findFirst({
    where: {
      community_id: props.communityId,
      user_id: props.member.id,
      is_owner: true,
    },
  });
  const isAdmin = await MyGlobal.prisma.community_admins.findFirst({
    where: { id: props.member.id },
  });
  if (!isOwner && !isAdmin) throw new HttpException("Unauthorized", 403);
  await MyGlobal.prisma.community_communities.delete({
    where: { id: props.communityId },
  });
  console.log(`Community ${props.communityId} deleted by ${props.member.id}`);
  return;
}
