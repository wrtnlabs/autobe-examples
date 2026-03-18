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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformModerationRoleTransformer } from "../transformers/CommunityPlatformModerationRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminCommunitiesCommunityIdModerationRoles(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerationRole.ICreate;
}): Promise<ICommunityPlatformModerationRole> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: {
        id: true,
        owner_id: true,
        deleted_at: true,
      },
    });
  if (community.deleted_at !== null) {
    throw new HttpException("Community is not active", 400);
  }
  if (community.owner_id !== props.admin.id) {
    throw new HttpException("Forbidden", 403);
  }
  const targetMember =
    await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
      where: { id: props.body.communityPlatformMemberId },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  if (targetMember.deleted_at !== null) {
    throw new HttpException("Target member is not active", 400);
  }
  if (props.body.roleType !== "owner" && props.body.roleType !== "moderator") {
    throw new HttpException("Invalid moderation role type", 400);
  }
  if (
    props.body.communityPlatformMemberId === community.owner_id &&
    props.body.roleType !== "owner"
  ) {
    throw new HttpException("Owner hierarchy conflict", 400);
  }
  const existing =
    await MyGlobal.prisma.community_platform_moderation_roles.findUnique({
      where: {
        community_platform_community_id_community_platform_member_id_role_type:
          {
            community_platform_community_id: props.communityId,
            community_platform_member_id: props.body.communityPlatformMemberId,
            role_type: props.body.roleType,
          },
      },
      select: { id: true },
    });
  if (existing !== null) {
    throw new HttpException("Moderation role already exists", 409);
  }
  const created =
    await MyGlobal.prisma.community_platform_moderation_roles.create({
      data: await CommunityPlatformModerationRoleCollector.collect({
        body: props.body,
        communityPlatformCommunities: { id: props.communityId },
      }),
      ...CommunityPlatformModerationRoleTransformer.select(),
    });
  return await CommunityPlatformModerationRoleTransformer.transform(created);
}
