import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformPostLinkTransformer } from "../transformers/CommunityPlatformPostLinkTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformModeratorPostsPostIdLink(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostLink> {
  const record = await MyGlobal.prisma.community_platform_post_links.findUnique(
    {
      where: { community_platform_post_id: props.postId },
      include: {
        post: {
          select: { post_type: true, deleted_at: true },
        },
      },
    },
  );
  if (
    record === null ||
    record.post.deleted_at !== null ||
    record.post.post_type !== "link"
  ) {
    throw new HttpException("Not found", 404);
  }
  const transformed =
    await CommunityPlatformPostLinkTransformer.transform(record);
  return transformed;
}
