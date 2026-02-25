import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformPostLinkTransformer } from "../transformers/CommunityPlatformPostLinkTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformUserPostsPostIdLink(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostLink> {
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: { id: true, post_type: true },
    },
  );
  if (post.post_type !== "link") {
    throw new HttpException("Post not found or not a link type", 404);
  }
  const linkRecord =
    await MyGlobal.prisma.community_platform_post_links.findUnique({
      where: { community_platform_post_id: props.postId },
      ...CommunityPlatformPostLinkTransformer.select(),
    });
  if (!linkRecord) {
    throw new HttpException("Link not found for post", 404);
  }
  return await CommunityPlatformPostLinkTransformer.transform(linkRecord);
}
