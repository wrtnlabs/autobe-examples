import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { CommunityPlatformPostLinkTransformer } from "../transformers/CommunityPlatformPostLinkTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformGuestPostsPostIdLink(props: {
  guest: GuestPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostLink> {
  const post = await MyGlobal.prisma.community_platform_posts.findFirstOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      post_type: true,
    },
  });
  if (post.post_type !== "link") {
    throw new HttpException(
      "Requested representation is unavailable for this post",
      404,
    );
  }
  const link =
    await MyGlobal.prisma.community_platform_post_links.findFirstOrThrow({
      where: {
        community_platform_post_id: props.postId,
        deleted_at: null,
      },
      ...CommunityPlatformPostLinkTransformer.select(),
    });
  return await CommunityPlatformPostLinkTransformer.transform(link);
}
