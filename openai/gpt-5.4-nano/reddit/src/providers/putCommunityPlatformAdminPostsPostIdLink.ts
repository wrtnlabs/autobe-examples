import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformPostTransformer } from "../transformers/CommunityPlatformPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminPostsPostIdLink(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IUpdateLink;
}): Promise<ICommunityPlatformPost> {
  const href = props.body.href;
  if (href.length === 0) throw new HttpException("Missing href", 400);
  try {
    // eslint-disable-next-line no-new
    new URL(href);
  } catch {
    throw new HttpException("Invalid uri", 400);
  }
  const posted =
    await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
      where: { id: props.postId },
      select: {
        id: true,
        deleted_at: true,
        post_type: true,
        link_url: true,
      },
    });
  if (posted.deleted_at !== null) {
    throw new HttpException("Not found", 404);
  }
  if (posted.post_type !== "link") {
    throw new HttpException("Post is not link type", 400);
  }
  const nowIso = toISOStringSafe(new Date());
  await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.community_platform_post_links.findUnique({
      where: { community_platform_post_id: props.postId },
      select: { id: true, deleted_at: true },
    });
    const displayTitle = props.body.display_title ?? null;
    const displayDescription = props.body.display_description;
    if (existing) {
      await tx.community_platform_post_links.update({
        where: { id: existing.id },
        data: {
          href,
          deleted_at: null,
          ...(displayTitle !== null && { display_title: displayTitle }),
          ...(displayDescription !== null && displayDescription !== undefined
            ? { display_description: displayDescription }
            : {}),
        },
      });
    } else {
      const url = new URL(href);
      const defaultTitle = props.body.display_title ?? url.hostname;
      // Prisma create input expects display_description to be a string (non-undefined).
      const defaultDesc = props.body.display_description ?? "";
      await tx.community_platform_post_links.create({
        data: {
          id: v4(),
          created_at: nowIso,
          updated_at: nowIso,
          community_platform_post_id: props.postId,
          href,
          display_title: defaultTitle,
          display_description: defaultDesc,
        },
      });
    }
    await tx.community_platform_posts.update({
      where: { id: props.postId },
      data: {
        link_url: href,
        edited_by_id: props.admin.id,
        edited_at: nowIso,
      },
    });
  });
  const updated =
    await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
      where: { id: props.postId },
      ...CommunityPlatformPostTransformer.select(),
    });
  return await CommunityPlatformPostTransformer.transform(updated);
}
