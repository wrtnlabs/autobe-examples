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

export async function putCommunityPlatformModeratorCommunitiesCommunityIdRulesRuleId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  ruleId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityRule.IUpdate;
}): Promise<ICommunityPlatformCommunityRule> {
  const { moderator, communityId, ruleId, body } = props;

  // 1. Moderator assignment check
  const mod = await MyGlobal.prisma.community_platform_moderators.findFirst({
    where: {
      member_id: moderator.id,
      community_id: communityId,
      status: "active",
      deleted_at: null,
    },
  });
  if (mod === null) {
    throw new HttpException(
      "Forbidden: Not an active moderator of the target community",
      403,
    );
  }

  // 2. Fetch current rule by community+rule id
  const rule =
    await MyGlobal.prisma.community_platform_community_rules.findFirst({
      where: {
        id: ruleId,
        community_id: communityId,
      },
    });
  if (rule === null) {
    throw new HttpException("Rule not found for the specified community", 404);
  }

  // 3. Validate version strictly greater
  if (typeof body.version !== "number" || body.version <= rule.version) {
    throw new HttpException(
      "Version must be strictly greater than the previous rule version",
      409,
    );
  }
  // 4. Validate body length
  if (typeof body.body !== "string" || body.body.length > 50000) {
    throw new HttpException(
      "Body exceeds maximum allowed length (50,000 characters)",
      400,
    );
  }

  // 5. Perform update (never change id/community_id/created_at)
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.community_platform_community_rules.update({
      where: { id: ruleId },
      data: {
        body: body.body,
        version: body.version,
        published_at: body.published_at,
        updated_at: now,
      },
    });

  // 6. Build DTO (no Date usage)
  return {
    id: updated.id,
    community_id: updated.community_id,
    body: updated.body,
    version: updated.version,
    published_at: toISOStringSafe(updated.published_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
  };
}
