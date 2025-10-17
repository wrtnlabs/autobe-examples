import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postCommunityPlatformAdminCommunitiesCommunityIdRules(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityRule.ICreate;
}): Promise<ICommunityPlatformCommunityRule> {
  // 1. Make sure the community exists and is not deleted
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // 2. Check for duplicate version for the same community
  const existing =
    await MyGlobal.prisma.community_platform_community_rules.findFirst({
      where: {
        community_id: props.communityId,
        version: props.body.version,
      },
    });
  if (existing) {
    throw new HttpException(
      "Rule version already exists for this community.",
      409,
    );
  }
  const now = toISOStringSafe(new Date());
  // 3. Create rule
  const created =
    await MyGlobal.prisma.community_platform_community_rules.create({
      data: {
        id: v4(),
        community_id: props.communityId,
        body: props.body.body,
        version: props.body.version,
        published_at: toISOStringSafe(props.body.published_at),
        created_at: now,
        updated_at: now,
      },
    });
  // 4. Return DTO
  return {
    id: created.id,
    community_id: created.community_id,
    body: created.body,
    version: created.version,
    published_at: toISOStringSafe(created.published_at),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
