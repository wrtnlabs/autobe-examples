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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommunityBannedUserTransformer } from "../transformers/CommunityPlatformCommunityBannedUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformModeratorCommunitiesCommunityIdBannedUsers(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBannedUser.ICreate;
}): Promise<ICommunityPlatformCommunityBannedUser> {
  // Verify the community exists and is active
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: {
        id: true,
        name: true,
        description: true,
        icon_url: true,
        owner_user_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (community.deleted_at !== null) {
    throw new HttpException("Community is deleted", 400);
  }
  // Check for duplicate ban entry
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
  // Collect the create input data
  const createData =
    await CommunityPlatformCommunityBannedUserCollector.collect({
      body: props.body,
      communityPlatformCommunities: community,
    });
  // Create the banned user record
  const created =
    await MyGlobal.prisma.community_platform_community_banned_users.create({
      data: createData,
      ...CommunityPlatformCommunityBannedUserTransformer.select(),
    });
  // Transform and return the response
  return await CommunityPlatformCommunityBannedUserTransformer.transform(
    created,
  );
}
