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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityWikiTransformer } from "../transformers/CommunityPlatformCommunityWikiTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminCommunitiesCommunityIdWikisWikiId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  wikiId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityWiki.IUpdate;
}): Promise<ICommunityPlatformCommunityWiki> {
  // Verify wiki exists and belongs to specified community
  await MyGlobal.prisma.community_platform_community_wikis.findUniqueOrThrow({
    where: {
      id: props.wikiId,
      community_platform_community_id: props.communityId,
    },
  });
  // Prepare update data with only provided fields
  const updateData = {
    ...(props.body.title !== undefined && { title: props.body.title }),
    ...(props.body.slug !== undefined && { slug: props.body.slug }),
    ...(props.body.content !== undefined && { content: props.body.content }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    updated_at: new Date(),
  } satisfies Prisma.community_platform_community_wikisUpdateInput;
  // Update the wiki record
  const updatedWiki =
    await MyGlobal.prisma.community_platform_community_wikis.update({
      where: { id: props.wikiId },
      data: updateData,
      ...CommunityPlatformCommunityWikiTransformer.select(),
    });
  // Transform and return the updated entity
  return await CommunityPlatformCommunityWikiTransformer.transform(updatedWiki);
}
