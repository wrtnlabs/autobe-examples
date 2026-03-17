import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostCollector } from "../collectors/CommunityPlatformPostCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostTransformer } from "../transformers/CommunityPlatformPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberPosts(props: {
  member: MemberPayload;
  body: ICommunityPlatformPost.ICreate;
}): Promise<ICommunityPlatformPost> {
  // Validate member subscription to community
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirstOrThrow({
      where: { name: props.body.community_name },
    });
  const subscription =
    await MyGlobal.prisma.community_platform_subscriptions.findFirst({
      where: {
        community_id: community.id,
        member_id: props.member.id,
        deleted_at: null,
      },
    });
  if (!subscription) {
    throw new HttpException(
      "You must be subscribed to this community to create posts",
      403,
    );
  }
  // Create post using Collector
  const created = await MyGlobal.prisma.community_platform_posts.create({
    data: await CommunityPlatformPostCollector.collect({
      body: props.body,
      author: { id: props.member.id },
      session: { id: props.member.session_id },
    }),
    ...CommunityPlatformPostTransformer.select(),
  });
  // Transform and return
  return await CommunityPlatformPostTransformer.transform(created);
}
