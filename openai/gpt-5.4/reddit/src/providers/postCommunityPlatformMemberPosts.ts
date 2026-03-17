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
  if (props.body.post_type === "text") {
    if (props.body.textContent === undefined)
      throw new HttpException("Text content is required.", 400);
    if (props.body.link !== undefined || props.body.postImage !== undefined)
      throw new HttpException(
        "Only text content is allowed for text posts.",
        400,
      );
  } else if (props.body.post_type === "link") {
    if (props.body.link === undefined)
      throw new HttpException("Link content is required.", 400);
    if (
      props.body.textContent !== undefined ||
      props.body.postImage !== undefined
    )
      throw new HttpException(
        "Only link content is allowed for link posts.",
        400,
      );
  } else if (props.body.post_type === "image") {
    if (props.body.postImage === undefined)
      throw new HttpException("Image content is required.", 400);
    if (props.body.textContent !== undefined || props.body.link !== undefined)
      throw new HttpException(
        "Only image content is allowed for image posts.",
        400,
      );
  } else {
    throw new HttpException("Invalid post type.", 400);
  }
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: {
        id: props.body.community_platform_community_id,
      },
      select: {
        id: true,
        status: true,
        deleted_at: true,
      },
    });
  if (community.deleted_at !== null || community.status !== "active")
    throw new HttpException("Community is unavailable for posting.", 403);
  const subscription =
    await MyGlobal.prisma.community_platform_subscriptions.findFirst({
      where: {
        community_platform_member_id: props.member.id,
        community_platform_community_id:
          props.body.community_platform_community_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (subscription === null) throw new HttpException("Forbidden", 403);
  const banned =
    await MyGlobal.prisma.community_platform_community_bans.findFirst({
      where: {
        community_platform_member_id: props.member.id,
        community_platform_community_id:
          props.body.community_platform_community_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (banned !== null) throw new HttpException("Forbidden", 403);
  const created = await MyGlobal.prisma.$transaction(async (prisma) =>
    prisma.community_platform_posts.create({
      data: await CommunityPlatformPostCollector.collect({
        body: props.body,
        member: {
          id: props.member.id,
        },
      }),
      ...CommunityPlatformPostTransformer.select(),
    }),
  );
  return await CommunityPlatformPostTransformer.transform(created);
}
