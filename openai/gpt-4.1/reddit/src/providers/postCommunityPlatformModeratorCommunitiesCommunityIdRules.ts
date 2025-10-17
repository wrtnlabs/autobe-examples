import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postCommunityPlatformModeratorCommunitiesCommunityIdRules(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityRule.ICreate;
}): Promise<ICommunityPlatformCommunityRule> {
  // Authorization: confirm moderator is active/assigned for this community
  const modRecord =
    await MyGlobal.prisma.community_platform_moderators.findFirst({
      where: {
        member_id: props.moderator.id,
        community_id: props.communityId,
        status: "active",
        deleted_at: null,
      },
    });
  if (!modRecord) {
    throw new HttpException(
      "Unauthorized: Not an active moderator of this community",
      403,
    );
  }
  // Prevent duplicate version numbers per community
  const duplicateRule =
    await MyGlobal.prisma.community_platform_community_rules.findFirst({
      where: {
        community_id: props.communityId,
        version: props.body.version,
      },
    });
  if (duplicateRule) {
    throw new HttpException(
      "Duplicate version: This version number already exists for the community.",
      409,
    );
  }
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.community_platform_community_rules.create({
      data: {
        id: v4(),
        community_id: props.communityId,
        body: props.body.body,
        version: props.body.version,
        published_at: props.body.published_at,
        created_at: now,
        updated_at: now,
      },
    });
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
