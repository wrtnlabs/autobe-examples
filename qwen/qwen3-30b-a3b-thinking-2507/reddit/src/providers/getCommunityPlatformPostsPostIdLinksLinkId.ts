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
import { CommunityPlatformPostAtSummaryTransformer } from "../transformers/CommunityPlatformPostAtSummaryTransformer";
import { CommunityPlatformPostLinkTransformer } from "../transformers/CommunityPlatformPostLinkTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformPostsPostIdLinksLinkId(props: {
  postId: string & tags.Format<"uuid">;
  linkId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostLink> {
  const link = await MyGlobal.prisma.community_platform_post_links.findUnique({
    where: { id: props.linkId },
    select: {
      id: true,
      url: true,
      domain_name: true,
      post: {
        select: CommunityPlatformPostAtSummaryTransformer.select().select,
      },
    },
  });
  if (!link) {
    throw new HttpException("Link not found", 404);
  }
  if (link.post.id !== props.postId) {
    throw new HttpException("Link does not belong to specified post", 404);
  }
  return await CommunityPlatformPostLinkTransformer.transform(link);
}
