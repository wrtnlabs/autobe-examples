import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformPostTransformer } from "../transformers/CommunityPlatformPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminPostsPostIdLink(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostLink.ICreate;
}): Promise<ICommunityPlatformPost> {
  const href = props.body.href;
  if (href.trim().length === 0) {
    throw new HttpException("Invalid href", 400);
  }
  const admin = await MyGlobal.prisma.community_platform_admins.findFirst({
    where: { id: props.admin.id, deleted_at: null },
    select: { id: true },
  });
  if (admin === null) {
    throw new HttpException("Forbidden", 403);
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const post = await tx.community_platform_posts.findUniqueOrThrow({
      where: { id: props.postId },
      select: {
        id: true,
        community_id: true,
        author_id: true,
        post_type: true,
        deleted_at: true,
      },
    });
    if (post.deleted_at !== null) {
      throw new HttpException("Not Found", 404);
    }
    const linkUrl = href;
    await tx.community_platform_posts.update({
      where: { id: post.id },
      data: {
        post_type: "link",
        link_url: linkUrl,
      },
    });
    await tx.community_platform_post_links.upsert({
      where: { community_platform_post_id: post.id },
      update: {
        href: href,
        display_title: props.body.displayTitle ?? "",
        display_description: props.body.displayDescription ?? "",
        deleted_at: null,
        updated_at: new Date(),
      },
      create: {
        id: v4() as string & tags.Format<"uuid">,
        href: href,
        display_title: props.body.displayTitle ?? "",
        display_description: props.body.displayDescription ?? "",
        deleted_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        post: { connect: { id: post.id } },
      },
    });
    const updated = await tx.community_platform_posts.findUniqueOrThrow({
      where: { id: post.id },
      ...CommunityPlatformPostTransformer.select(),
    });
    return await CommunityPlatformPostTransformer.transform(updated);
  });
}
