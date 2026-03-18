import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
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
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.body.community_id },
    select: { id: true },
  });
  const subscription =
    await MyGlobal.prisma.community_platform_community_subscriptions.findFirst({
      where: {
        community_platform_community_id: props.body.community_id,
        community_platform_member_id: props.member.id,
      },
      select: { id: true },
    });
  if (subscription === null) throw new HttpException("Forbidden", 403);
  if (
    props.body.contentType === "text" &&
    (props.body.text === null || props.body.text === undefined)
  ) {
    throw new HttpException("Text content is required", 400);
  }
  if (
    props.body.contentType === "link" &&
    (props.body.link === null || props.body.link === undefined)
  ) {
    throw new HttpException("Link content is required", 400);
  }
  if (
    props.body.contentType === "image" &&
    (props.body.image === null || props.body.image === undefined)
  ) {
    throw new HttpException("Image content is required", 400);
  }
  const created = await MyGlobal.prisma.community_platform_posts.create({
    data: await CommunityPlatformPostCollector.collect({
      body: props.body,
      author: { id: props.member.id },
    }),
    ...CommunityPlatformPostTransformer.select(),
  });
  return await CommunityPlatformPostTransformer.transform(created);
}
