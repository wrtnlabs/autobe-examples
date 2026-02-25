import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformModeratorAtSummaryTransformer } from "./CommunityPlatformModeratorAtSummaryTransformer";
import { CommunityPlatformUserAtSummaryTransformer } from "./CommunityPlatformUserAtSummaryTransformer";

export namespace CommunityPlatformCommunityBanAtSummaryTransformer {
  export type Payload = Prisma.community_platform_community_bansGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        banned_at: true,
        expires_at: true,
        revoked_at: true,
        revoke_reason: true,
        created_at: true,
        updated_at: true,
        user: CommunityPlatformUserAtSummaryTransformer.select(),
        moderator: CommunityPlatformModeratorAtSummaryTransformer.select(),
        community: {
          select: { id: true },
        } satisfies Prisma.community_platform_communitiesFindManyArgs,
        moderationAuditLogs: {
          select: { id: true },
        } satisfies Prisma.community_platform_moderation_audit_logsFindManyArgs,
      },
    } satisfies Prisma.community_platform_community_bansFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformCommunityBan.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status,
      banned_at: input.banned_at.toISOString(),
      expires_at: input.expires_at ? input.expires_at.toISOString() : null,
      user: await CommunityPlatformUserAtSummaryTransformer.transform(
        input.user,
      ),
      moderator: await CommunityPlatformModeratorAtSummaryTransformer.transform(
        input.moderator,
      ),
    };
  }
}
