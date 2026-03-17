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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformModeratorTransformer } from "../transformers/CommunityPlatformModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerator> {
  // 1. Verify the requesting member has moderator access to the community
  const requestingModerator =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (requestingModerator === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Retrieve the specific moderator record by ID within the community
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findFirstOrThrow({
      where: {
        id: props.moderatorId,
        community_platform_community_id: props.communityId,
        deleted_at: null,
      },
      ...CommunityPlatformModeratorTransformer.select(),
    });
  // 3. Transform and return
  return await CommunityPlatformModeratorTransformer.transform(moderator);
}
