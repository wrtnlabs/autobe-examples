import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostTextCollector } from "../collectors/CommunityPlatformPostTextCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostTextTransformer } from "../transformers/CommunityPlatformPostTextTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberPostsPostIdTexts(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostText.ICreate;
}): Promise<ICommunityPlatformPostText> {
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: {
        id: props.postId,
      },
      select: {
        id: true,
        community_platform_member_id: true,
        post_type: true,
        status: true,
        deleted_at: true,
      },
    },
  );
  if (post.community_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (post.post_type !== "text") {
    throw new HttpException("Target post is not a text post", 400);
  }
  if (post.deleted_at !== null) {
    throw new HttpException(
      "Target post is unavailable for content creation",
      400,
    );
  }
  if (post.status !== "draft" && post.status !== "active") {
    throw new HttpException(
      "Target post is unavailable for content creation",
      400,
    );
  }
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.community_platform_post_texts.findUnique({
      where: {
        community_platform_post_id: props.postId,
      },
      select: {
        id: true,
      },
    });
    if (existing !== null) {
      throw new HttpException("Text content already exists for this post", 409);
    }
    return await tx.community_platform_post_texts.create({
      data: await CommunityPlatformPostTextCollector.collect({
        body: props.body,
        post: {
          id: post.id,
        },
      }),
      ...CommunityPlatformPostTextTransformer.select(),
    });
  });
  return await CommunityPlatformPostTextTransformer.transform(created);
}
