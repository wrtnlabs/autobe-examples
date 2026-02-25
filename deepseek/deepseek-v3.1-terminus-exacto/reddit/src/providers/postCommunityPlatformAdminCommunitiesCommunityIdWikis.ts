import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityWiki } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityWiki";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityWikiCollector } from "../collectors/CommunityPlatformCommunityWikiCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityWikiTransformer } from "../transformers/CommunityPlatformCommunityWikiTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminCommunitiesCommunityIdWikis(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityWiki.ICreate;
}): Promise<ICommunityPlatformCommunityWiki> {
  // Verify community exists
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
    });
  // Check if slug is already used in this community
  const existingWiki =
    await MyGlobal.prisma.community_platform_community_wikis.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        slug: props.body.slug,
        deleted_at: null,
      },
    });
  if (existingWiki) {
    throw new HttpException(
      "Wiki page with this slug already exists in the community",
      409,
    );
  }
  try {
    // Create wiki page using collector
    const wiki =
      await MyGlobal.prisma.community_platform_community_wikis.create({
        data: await CommunityPlatformCommunityWikiCollector.collect({
          body: props.body,
          communityPlatformCommunities: { id: props.communityId },
          communityPlatformUsers: { id: props.admin.id },
        }),
        ...CommunityPlatformCommunityWikiTransformer.select(),
      });
    // Transform and return response
    return await CommunityPlatformCommunityWikiTransformer.transform(wiki);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new HttpException(
          "Wiki page with this slug already exists in the community",
          409,
        );
      }
    }
    throw error;
  }
}
