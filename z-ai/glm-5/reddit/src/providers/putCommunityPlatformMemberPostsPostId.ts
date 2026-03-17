import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostTransformer } from "../transformers/CommunityPlatformPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IUpdate;
}): Promise<ICommunityPlatformPost> {
  // 1. Fetch the post to verify existence and ownership
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: { id: true, author_id: true, post_type: true },
    },
  );
  // 2. Validate ownership
  if (post.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Update post title and timestamp
  await MyGlobal.prisma.community_platform_posts.update({
    where: { id: props.postId },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      updated_at: new Date(),
    },
  });
  // 4. Update type-specific content
  if (post.post_type === "text" && props.body.text !== undefined) {
    await MyGlobal.prisma.community_platform_post_text_contents.update({
      where: { community_platform_post_id: props.postId },
      data: {
        content: props.body.text,
        updated_at: new Date(),
      },
    });
  }
  if (post.post_type === "link" && props.body.url !== undefined) {
    const domain = new URL(props.body.url).hostname;
    await MyGlobal.prisma.community_platform_post_link_urls.update({
      where: { community_platform_post_id: props.postId },
      data: {
        url: props.body.url,
        domain,
        updated_at: new Date(),
      },
    });
  }
  // 5. Fetch and return updated post
  const updated =
    await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
      where: { id: props.postId },
      ...CommunityPlatformPostTransformer.select(),
    });
  return await CommunityPlatformPostTransformer.transform(updated);
}
