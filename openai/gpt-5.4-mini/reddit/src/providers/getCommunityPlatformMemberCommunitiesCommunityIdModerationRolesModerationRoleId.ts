import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformModerationRoleTransformer } from "../transformers/CommunityPlatformModerationRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberCommunitiesCommunityIdModerationRolesModerationRoleId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderationRoleId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerationRole> {
  const moderationRole =
    await MyGlobal.prisma.community_platform_moderation_roles.findFirstOrThrow({
      where: {
        id: props.moderationRoleId,
        community_platform_community_id: props.communityId,
      },
      ...CommunityPlatformModerationRoleTransformer.select(),
    });
  return await CommunityPlatformModerationRoleTransformer.transform(
    moderationRole,
  );
}
