import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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

export async function postCommunityPlatformUserPosts(props: {
  user: UserPayload;
  body: ICommunityPlatformPost.ICreate;
}): Promise<ICommunityPlatformPost> {
  // Lookup community by name
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: { name: props.body.community_name },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Verify user is subscribed to the target community
  const subscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findFirst({
      where: {
        community: { id: community.id },
        user: { id: props.user.id },
      },
    });
  if (!subscription) {
    throw new HttpException(
      "You must be subscribed to this community to create posts",
      403,
    );
  }
  // Use collector to transform request body to database input
  const postData = await CommunityPlatformPostCollector.collect({
    body: props.body,
    communityPlatformUsers: { id: props.user.id } as IEntity,
    communityPlatformUserSessions: { id: props.user.session_id } as IEntity,
  });
  // Create the post
  const createdPost = await MyGlobal.prisma.community_platform_posts.create({
    data: postData,
    ...CommunityPlatformPostTransformer.select(),
  });
  // Transform and return the response
  return await CommunityPlatformPostTransformer.transform(createdPost);
}
