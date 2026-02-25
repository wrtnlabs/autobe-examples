import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformAdminCommunitiesCommunityIdRulesRuleId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  ruleId: string & tags.Format<"uuid">;
}): Promise<void> {
  try {
    // Verify the rule exists and belongs to the specified community
    await MyGlobal.prisma.community_platform_community_rules.findUniqueOrThrow({
      where: {
        id: props.ruleId,
        community_platform_community_id: props.communityId,
      },
    });
    // Perform hard delete operation
    await MyGlobal.prisma.community_platform_community_rules.delete({
      where: { id: props.ruleId },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Record to delete does not exist")
    ) {
      throw new HttpException("Rule not found", 404);
    }
    throw error;
  }
}
