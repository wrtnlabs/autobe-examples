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
  // Validate text content is not empty or whitespace-only (business rule)
  if (!props.body.content || props.body.content.trim().length === 0) {
    throw new HttpException(
      "Text content cannot be empty or whitespace-only",
      400,
    );
  }
  // Verify post exists and get its type and author
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        content_type: true,
        community_platform_member_id: true, // Check owner via FK
      },
    },
  );
  // Check post type is TEXT (assuming uppercase based on requirements)
  if (post.content_type !== "TEXT") {
    throw new HttpException("Post must be TEXT type to add text content", 400);
  }
  // Check member is post author
  if (post.community_platform_member_id !== props.member.id) {
    throw new HttpException("Only post author can add text content", 403);
  }
  // Check if text content already exists for this post (1:1 relationship)
  const existingText =
    await MyGlobal.prisma.community_platform_post_texts.findUnique({
      where: { community_platform_post_id: props.postId },
    });
  let result;
  if (existingText) {
    // Update existing text content
    const data = await CommunityPlatformPostTextCollector.collect({
      body: props.body,
      post: { id: post.id },
    });
    result = await MyGlobal.prisma.community_platform_post_texts.update({
      where: { id: existingText.id },
      data,
      ...CommunityPlatformPostTextTransformer.select(),
    });
  } else {
    // Create new text content
    const data = await CommunityPlatformPostTextCollector.collect({
      body: props.body,
      post: { id: post.id },
    });
    result = await MyGlobal.prisma.community_platform_post_texts.create({
      data,
      ...CommunityPlatformPostTextTransformer.select(),
    });
  }
  // Transform to response DTO
  return await CommunityPlatformPostTextTransformer.transform(result);
}
