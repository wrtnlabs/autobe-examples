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
import { CommunityPlatformModerationRoleCollector } from "../collectors/CommunityPlatformModerationRoleCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformModerationRoleTransformer } from "../transformers/CommunityPlatformModerationRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberCommunitiesCommunityIdModerationRoles(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerationRole.ICreate;
}): Promise<ICommunityPlatformModerationRole> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
      },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  if (community.deleted_at !== null)
    throw new HttpException("Community is not available", 400);
  await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
    where: {
      id: props.body.communityPlatformMemberId,
    },
    select: {
      id: true,
    },
  });
  const duplicated =
    await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.body.communityPlatformMemberId,
        role_type: props.body.roleType,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (duplicated !== null) throw new HttpException("Conflict", 409);
  const created =
    await MyGlobal.prisma.community_platform_moderation_roles.create({
      data: await CommunityPlatformModerationRoleCollector.collect({
        body: props.body,
        communityPlatformCommunities: {
          id: props.communityId,
        },
      }),
      ...CommunityPlatformModerationRoleTransformer.select(),
    });
  return CommunityPlatformModerationRoleTransformer.transform(created);
}
