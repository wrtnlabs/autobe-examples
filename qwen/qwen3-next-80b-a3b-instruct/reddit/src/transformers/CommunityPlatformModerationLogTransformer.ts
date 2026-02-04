import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOwner";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CommunityPlatformModeratorAtSummaryTransformer } from "./CommunityPlatformModeratorAtSummaryTransformer";
import { CommunityPlatformOwnerTransformer } from "./CommunityPlatformOwnerTransformer";
import { CommunityPlatformCommentTransformer } from "./CommunityPlatformCommentTransformer";
import { CommunityPlatformReportTransformer } from "./CommunityPlatformReportTransformer";
import { CommunityPlatformBanTransformer } from "./CommunityPlatformBanTransformer";

export namespace CommunityPlatformModerationLogTransformer {
  export type Payload = Prisma.community_platform_moderation_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        reason: true,
        target_entity_type: true,
        created_at: true,
        moderator: CommunityPlatformModeratorAtSummaryTransformer.select(),
        owner: CommunityPlatformOwnerTransformer.select(),
        targetComment: CommunityPlatformCommentTransformer.select(),
        targetReport: CommunityPlatformReportTransformer.select(),
        targetBan: CommunityPlatformBanTransformer.select(),
        target: true, // Required by schema
      },
    } satisfies Prisma.community_platform_moderation_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformModerationLog> {
    return {
      log_id: input.id,
      moderator_id: input.moderator.id,
      targetComment: input.targetComment
        ? await CommunityPlatformCommentTransformer.transform(
            input.targetComment,
          )
        : null,
      targetReport: input.targetReport
        ? await CommunityPlatformReportTransformer.transform(input.targetReport)
        : null,
      targetBan: input.targetBan
        ? await CommunityPlatformBanTransformer.transform(input.targetBan)
        : null,
      moderator: await CommunityPlatformModeratorAtSummaryTransformer.transform(
        input.moderator,
      ),
      owner: input.owner
        ? await CommunityPlatformOwnerTransformer.transform(input.owner)
        : null,
    };
  }
}
