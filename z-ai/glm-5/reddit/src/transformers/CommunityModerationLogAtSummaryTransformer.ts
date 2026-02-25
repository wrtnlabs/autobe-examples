import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerationLog";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { CommunityCommentAtSummaryTransformer } from "./CommunityCommentAtSummaryTransformer";
import { CommunityCommunityAtSummaryTransformer } from "./CommunityCommunityAtSummaryTransformer";
import { CommunityMemberAtSummaryTransformer } from "./CommunityMemberAtSummaryTransformer";
import { CommunityPostAtSummaryTransformer } from "./CommunityPostAtSummaryTransformer";

export namespace CommunityModerationLogAtSummaryTransformer {
  export type Payload = Prisma.community_moderation_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        reason: true,
        created_at: true,
        community: CommunityCommunityAtSummaryTransformer.select(),
        actor: CommunityMemberAtSummaryTransformer.select(),
        memberTarget: CommunityMemberAtSummaryTransformer.select(),
        postTarget: CommunityPostAtSummaryTransformer.select(),
        commentTarget: CommunityCommentAtSummaryTransformer.select(),
      },
    } satisfies Prisma.community_moderation_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityModerationLog.ISummary> {
    return {
      id: input.id,
      actionType: input.action_type,
      actor: await CommunityMemberAtSummaryTransformer.transform(input.actor),
      community: await CommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      reason: input.reason,
      targetMember: input.memberTarget
        ? await CommunityMemberAtSummaryTransformer.transform(
            input.memberTarget,
          )
        : null,
      targetPost: input.postTarget
        ? await CommunityPostAtSummaryTransformer.transform(input.postTarget)
        : null,
      targetComment: input.commentTarget
        ? await CommunityCommentAtSummaryTransformer.transform(
            input.commentTarget,
          )
        : null,
      createdAt: toISOStringSafe(input.created_at),
    };
  }
}
