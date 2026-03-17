import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
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
import { CommunityPlatformCommunityModeratorTransformer } from "../transformers/CommunityPlatformCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberCommunitiesCommunityIdModeratorsModeratorId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderatorId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityModerator> {
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: {
      id: props.communityId,
    },
    select: {
      id: true,
    },
  });
  const target =
    await MyGlobal.prisma.community_platform_community_moderators.findFirstOrThrow(
      {
        where: {
          id: props.moderatorId,
          community_platform_community_id: props.communityId,
        },
        ...CommunityPlatformCommunityModeratorTransformer.select(),
      },
    );
  const moderatorRecord =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.member.id,
        status: "active",
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  const ownerRecord =
    moderatorRecord === null
      ? null
      : await MyGlobal.prisma.community_platform_community_moderator_owners.findFirst(
          {
            where: {
              community_platform_community_moderator_id: moderatorRecord.id,
            },
            select: {
              id: true,
            },
          },
        );
  if (
    ownerRecord === null &&
    moderatorRecord === null &&
    target.member.id !== props.member.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  return await CommunityPlatformCommunityModeratorTransformer.transform(target);
}
