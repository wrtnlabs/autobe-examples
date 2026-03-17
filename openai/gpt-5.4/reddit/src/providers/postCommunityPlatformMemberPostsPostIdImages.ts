import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostImageCollector } from "../collectors/CommunityPlatformPostImageCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostImageTransformer } from "../transformers/CommunityPlatformPostImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberPostsPostIdImages(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostImage.ICreate;
}): Promise<ICommunityPlatformPostImage> {
  const post = await MyGlobal.prisma.community_platform_posts.findFirstOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      community_platform_member_id: true,
      post_type: true,
      status: true,
    },
  });
  if (post.community_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (post.post_type !== "image") {
    throw new HttpException("Post type does not allow image content", 400);
  }
  if (post.status !== "active") {
    throw new HttpException("Post is unavailable", 400);
  }
  const existing =
    await MyGlobal.prisma.community_platform_post_images.findUnique({
      where: {
        community_platform_post_id: props.postId,
      },
      select: {
        id: true,
      },
    });
  if (existing !== null) {
    throw new HttpException("Post image already exists", 409);
  }
  const created = await MyGlobal.prisma.community_platform_post_images.create({
    data: await CommunityPlatformPostImageCollector.collect({
      body: props.body,
      post: {
        id: props.postId,
      },
    }),
    ...CommunityPlatformPostImageTransformer.select(),
  });
  return await CommunityPlatformPostImageTransformer.transform(created);
}
