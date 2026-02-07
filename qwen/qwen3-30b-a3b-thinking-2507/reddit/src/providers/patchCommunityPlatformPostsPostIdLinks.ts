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
import { CommunityPlatformPostLinkTransformer } from "../transformers/CommunityPlatformPostLinkTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformPostsPostIdLinks(props: {
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostLink.IUpdate;
}): Promise<ICommunityPlatformPostLink> {
  const link = await MyGlobal.prisma.community_platform_post_links.findUnique({
    where: { community_platform_post_id: props.postId },
  });
  if (!link) {
    throw new HttpException("Post does not have a link record", 404);
  }
  const url = (
    props.body as {
      url: string;
    }
  ).url;
  if (!url) {
    throw new HttpException("URL cannot be empty", 404);
  }
  try {
    new URL(url);
    try {
    } catch {
      throw new HttpException("Invalid URL format", 400);
    }
    const domainName =
      (
        props.body as {
          domain_name?: string;
        }
      ).domain_name ?? extractDomainName(url);
    const updatedLink =
      await MyGlobal.prisma.community_platform_post_links.update({
        where: { id: link.id },
        data: {
          url: url,
          domain_name: domainName,
        },
      });
    return await CommunityPlatformPostLinkTransformer.transform(updatedLink);
    function extractDomainName(url: string): string {
      try {
        return new URL(url).hostname.replace(/^www\./, "");
        try {
        } catch {
          return url.toLowerCase().split("://")[1]?.split("/")[0] ?? url;
        }
      } finally {
      }
    }
  } finally {
  }
}
