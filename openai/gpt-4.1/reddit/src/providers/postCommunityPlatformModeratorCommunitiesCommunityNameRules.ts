import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postCommunityPlatformModeratorCommunitiesCommunityNameRules(props: {
  moderator: ModeratorPayload;
  communityName: string;
  body: ICommunityPlatformCommunityRule.ICreate;
}): Promise<ICommunityPlatformCommunityRule> {
  // 1. Find the community by name, ensuring active and not deleted
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        name: props.communityName,
        deleted_at: null,
        status: "active",
      },
    });
  if (!community) {
    throw new HttpException("Community not found or unavailable.", 404);
  }
  // 2. Verify moderator assignment for this community
  const moderatorLink =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: community.id,
        moderator_id: props.moderator.id,
        status: "active",
      },
    });
  if (!moderatorLink) {
    throw new HttpException(
      "You are not an active moderator for this community.",
      403,
    );
  }
  // 3. Ensure rule code uniqueness within the community
  const codeExists =
    await MyGlobal.prisma.community_platform_community_rules.findFirst({
      where: {
        community_platform_community_id: community.id,
        code: props.body.code,
      },
    });
  if (codeExists) {
    throw new HttpException(
      "A rule with this code already exists in this community.",
      409,
    );
  }
  // 4. Create the rule
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.community_platform_community_rules.create({
      data: {
        id: v4(),
        community_platform_community_id: community.id,
        code: props.body.code,
        description: props.body.description,
        display_order: props.body.display_order,
        enforced: props.body.enforced,
        created_at: now,
        updated_at: now,
      },
    });
  // 5. Return correct shape, including mapping the community summary
  return {
    id: created.id,
    code: created.code,
    description: created.description,
    display_order: created.display_order,
    enforced: created.enforced,
    community: {
      id: community.id,
      name: community.name,
      display_title: community.display_title,
      description: community.description,
      visibility: community.visibility,
      image_url:
        typeof community.image_url === "string"
          ? community.image_url
          : undefined,
      status: community.status,
    },
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
