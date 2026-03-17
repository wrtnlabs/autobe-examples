import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
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
import { CommunityPlatformBanCollector } from "../collectors/CommunityPlatformBanCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformBanTransformer } from "../transformers/CommunityPlatformBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberCommunitiesCommunityIdBans(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformBan.ICreate;
}): Promise<ICommunityPlatformBan> {
  // 1. Verify the community exists and is not deleted
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
  });
  // 2. Verify the requesting member has moderator privileges in this community
  const moderatorRecord =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (!moderatorRecord) {
    throw new HttpException("You are not a moderator of this community", 403);
  }
  // 3. Verify the member to be banned exists and is not deleted
  await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
    where: {
      id: props.body.memberId,
      deleted_at: null,
    },
  });
  // 4. Check no active ban exists for this member in this community
  const existingBan = await MyGlobal.prisma.community_platform_bans.findFirst({
    where: {
      community_id: props.communityId,
      member_id: props.body.memberId,
      deleted_at: null,
    },
  });
  if (existingBan) {
    throw new HttpException(
      "Member is already banned from this community",
      400,
    );
  }
  // 5. Create the ban record using the collector
  const createdBan = await MyGlobal.prisma.community_platform_bans.create({
    data: await CommunityPlatformBanCollector.collect({
      body: props.body,
      communityPlatformCommunities: { id: props.communityId },
      communityPlatformModerators: { id: moderatorRecord.id },
    }),
    ...CommunityPlatformBanTransformer.select(),
  });
  // 6. Return the transformed ban
  return await CommunityPlatformBanTransformer.transform(createdBan);
}
