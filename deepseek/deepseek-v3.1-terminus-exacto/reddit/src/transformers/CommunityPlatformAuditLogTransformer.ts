import { ICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuditLog";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityPlatformCommentAtSummaryTransformer } from "./CommunityPlatformCommentAtSummaryTransformer";
import { CommunityPlatformCommunityAtSummaryTransformer } from "./CommunityPlatformCommunityAtSummaryTransformer";
import { CommunityPlatformPostAtSummaryTransformer } from "./CommunityPlatformPostAtSummaryTransformer";

export namespace CommunityPlatformAuditLogTransformer {
  export type Payload = Prisma.community_platform_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        actor_id: true,
        action_type: true,
        action_details: true,
        ip_address: true,
        user_agent: true,
        success: true,
        error_message: true,
        created_at: true,
        updated_at: true,
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
        post: CommunityPlatformPostAtSummaryTransformer.select(),
        comment: CommunityPlatformCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_platform_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformAuditLog> {
    return {
      id: input.id,
      actor_type: input.actor_type,
      actor_id: input.actor_id,
      action_type: input.action_type,
      action_details: input.action_details ?? undefined,
      ip_address: input.ip_address,
      user_agent: input.user_agent ?? undefined,
      success: input.success,
      error_message: input.error_message ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      community: input.community
        ? await CommunityPlatformCommunityAtSummaryTransformer.transform(
            input.community,
          )
        : null,
      post: input.post
        ? await CommunityPlatformPostAtSummaryTransformer.transform(input.post)
        : null,
      comment: input.comment
        ? await CommunityPlatformCommentAtSummaryTransformer.transform(
            input.comment,
          )
        : null,
    };
  }
}
