import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostCollector } from "../collectors/CommunityPlatformPostCollector";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformPostTransformer } from "../transformers/CommunityPlatformPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformUserCommunitiesCommunityIdPosts(props: {
  user: UserPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.ICreate;
}): Promise<ICommunityPlatformPost> {
  // Verify subscription to community
  const subscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.user.id,
        deleted_at: null,
      },
    });
  if (!subscription) {
    throw new HttpException(
      "Forbidden: User not subscribed to the community",
      403,
    );
  }
  // Load the community
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
    });
  // Load the user author info
  const authorUser =
    await MyGlobal.prisma.community_platform_users.findUniqueOrThrow({
      where: { id: props.user.id },
    });
  // Collect create data for post
  const data = await CommunityPlatformPostCollector.collect({
    body: props.body,
    community,
    authorUser,
  });
  // Create post
  const created = await MyGlobal.prisma.community_platform_posts.create({
    data,
    ...CommunityPlatformPostTransformer.select(),
  });
  // Transform and return
  return await CommunityPlatformPostTransformer.transform(created);
}
