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

export async function patchCommunityPlatformAdminPostsPostIdLink(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostLink.ICreate;
}): Promise<ICommunityPlatformPost> {
  const href = props.body.href;
  if (href.trim().length === 0) {
    throw new HttpException("href is required", 400);
  }
  if (
    props.body.displayTitle === undefined &&
    props.body.displayDescription === undefined
  ) {
    // allowed: collector behavior derives/refreshes; since we don't have domain extraction helpers here,
    // keep stored fields consistent by using empty-string defaults.
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const post = await tx.community_platform_posts.findUniqueOrThrow({
      where: { id: props.postId },
      select: {
        id: true,
        post_type: true,
        deleted_at: true,
        edited_by_id: true,
        deleted_by_id: true,
      },
    });
    if (post.deleted_at !== null) {
      throw new HttpException("Post is deleted", 400);
    }
    if (post.post_type !== "link") {
      throw new HttpException("Post is not a link post", 400);
    }
    const display_title = props.body.displayTitle ?? "";
    const display_description = props.body.displayDescription ?? "";
    await tx.community_platform_post_links.upsert({
      where: { community_platform_post_id: props.postId },
      create: {
        id: v4(),
        href,
        display_title,
        display_description,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        post: {
          connect: { id: props.postId },
        },
      },
      update: {
        href,
        display_title,
        display_description,
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    await tx.community_platform_posts.update({
      where: { id: props.postId },
      data: {
        edited_by_id: props.admin.id,
        edited_at: new Date(),
        updated_at: new Date(),
      },
    });
    const updated = await tx.community_platform_posts.findUniqueOrThrow({
      where: { id: props.postId },
      ...CommunityPlatformPostTransformer.select(),
    });
    return await CommunityPlatformPostTransformer.transform(updated);
  });
}
