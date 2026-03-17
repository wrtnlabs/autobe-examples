import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformModeratorCollector } from "../collectors/CommunityPlatformModeratorCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformModeratorTransformer } from "../transformers/CommunityPlatformModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberCommunitiesCommunityIdModerators(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerator.ICreate;
}): Promise<ICommunityPlatformModerator> {
  // Authorization check - verify requester has owner or moderator role
  const requesterRole =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (requesterRole === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify target member exists and is not deleted
  const targetMember =
    await MyGlobal.prisma.community_platform_members.findUnique({
      where: { id: props.body.memberId },
      select: { id: true, deleted_at: true },
    });
  if (targetMember === null || targetMember.deleted_at !== null) {
    throw new HttpException("Target member not found", 404);
  }
  // Check if target is already a moderator of this community
  const existingModerator =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.body.memberId,
        deleted_at: null,
      },
    });
  if (existingModerator !== null) {
    throw new HttpException(
      "Member is already a moderator of this community",
      409,
    );
  }
  // Create moderator using collector
  const createInput = await CommunityPlatformModeratorCollector.collect({
    body: props.body,
    communityPlatformCommunities: { id: props.communityId },
  });
  await MyGlobal.prisma.community_platform_moderators.create({
    data: createInput,
  });
  // Fetch with relations using transformer select
  const created =
    await MyGlobal.prisma.community_platform_moderators.findUniqueOrThrow({
      where: { id: createInput.id },
      ...CommunityPlatformModeratorTransformer.select(),
    });
  return await CommunityPlatformModeratorTransformer.transform(created);
}
