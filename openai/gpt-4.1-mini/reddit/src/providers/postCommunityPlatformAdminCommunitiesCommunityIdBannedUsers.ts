import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityBannedUserCollector } from "../collectors/CommunityPlatformCommunityBannedUserCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityBannedUserTransformer } from "../transformers/CommunityPlatformCommunityBannedUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminCommunitiesCommunityIdBannedUsers(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBannedUser.ICreate;
}): Promise<ICommunityPlatformCommunityBannedUser> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { id: true, deleted_at: true },
    });
  if (community.deleted_at !== null) {
    throw new HttpException("Community not found or inactive", 404);
  }
  const existingBan =
    await MyGlobal.prisma.community_platform_community_banned_users.findUnique({
      where: {
        community_id_user_id: {
          community_id: props.communityId,
          user_id: props.body.user_id,
        },
      },
    });
  if (existingBan !== null) {
    throw new HttpException("User is already banned in this community", 409);
  }
  const data = await CommunityPlatformCommunityBannedUserCollector.collect({
    body: props.body,
    communityPlatformCommunities: { id: props.communityId },
  });
  const created =
    await MyGlobal.prisma.community_platform_community_banned_users.create({
      data: data,
      ...CommunityPlatformCommunityBannedUserTransformer.select(),
    });
  return await CommunityPlatformCommunityBannedUserTransformer.transform(
    created,
  );
}
