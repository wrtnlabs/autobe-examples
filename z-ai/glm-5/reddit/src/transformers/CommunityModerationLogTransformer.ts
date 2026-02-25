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

export namespace CommunityModerationLogTransformer {
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
        actor: CommunityMemberAtSummaryTransformer.select(),
        community: CommunityCommunityAtSummaryTransformer.select(),
        memberTarget: {
          select: {
            member: CommunityMemberAtSummaryTransformer.select(),
          },
        },
        postTarget: {
          select: {
            post: CommunityPostAtSummaryTransformer.select(),
          },
        },
        commentTarget: {
          select: {
            comment: CommunityCommentAtSummaryTransformer.select(),
          },
        },
      },
    } satisfies Prisma.community_moderation_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityModerationLog> {
    const target =
      input.action_type === "MODERATOR_ADDED" ||
      input.action_type === "MODERATOR_REMOVED" ||
      input.action_type === "USER_BANNED" ||
      input.action_type === "USER_UNBANNED"
        ? input.memberTarget?.member
          ? await CommunityMemberAtSummaryTransformer.transform(
              input.memberTarget.member,
            )
          : null
        : input.action_type === "POST_DELETED"
          ? input.postTarget?.post
            ? await CommunityPostAtSummaryTransformer.transform(
                input.postTarget.post,
              )
            : null
          : input.action_type === "COMMENT_DELETED"
            ? input.commentTarget?.comment
              ? await CommunityCommentAtSummaryTransformer.transform(
                  input.commentTarget.comment,
                )
              : null
            : null;
    if (!target) {
      throw new Error(
        `Missing target for moderation log ${input.id} with action_type ${input.action_type}`,
      );
    }
    return {
      id: input.id,
      actionType: input.action_type,
      reason: input.reason ?? null,
      createdAt: input.created_at.toISOString(),
      actor: await CommunityMemberAtSummaryTransformer.transform(input.actor),
      community: await CommunityCommunityAtSummaryTransformer.transform(
        input.community,
      ),
      target,
    };
  }
}
