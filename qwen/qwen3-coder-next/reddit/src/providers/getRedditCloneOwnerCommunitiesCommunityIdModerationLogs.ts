import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModerationLog";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationLog";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { RedditCloneContentCommentAtSummaryTransformer } from "../transformers/RedditCloneContentCommentAtSummaryTransformer";
import { RedditCloneContentPostAtSummaryTransformer } from "../transformers/RedditCloneContentPostAtSummaryTransformer";
import { RedditCloneModeratorAtSummaryTransformer } from "../transformers/RedditCloneModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneOwnerCommunitiesCommunityIdModerationLogs(props: {
  owner: OwnerPayload;
  communityId: string;
}): Promise<IPageIRedditCloneModerationLog.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    MyGlobal.prisma.reddit_clone_moderation_logs.findMany({
      where: {
        OR: [
          {
            post: {
              community_id: props.communityId,
              deleted_at: null,
            },
          },
          {
            comment: {
              post: {
                community_id: props.communityId,
                deleted_at: null,
              },
            },
          },
        ],
      },
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      include: {
        moderator: RedditCloneModeratorAtSummaryTransformer.select(),
        post: RedditCloneContentPostAtSummaryTransformer.select(),
        comment: RedditCloneContentCommentAtSummaryTransformer.select(),
      },
    }),
    MyGlobal.prisma.reddit_clone_moderation_logs.count({
      where: {
        OR: [
          {
            post: {
              community_id: props.communityId,
              deleted_at: null,
            },
          },
          {
            comment: {
              post: {
                community_id: props.communityId,
                deleted_at: null,
              },
            },
          },
        ],
      },
    }),
  ]);
  const transformedLogs = await ArrayUtil.asyncMap(logs, async (log) => {
    const moderator = await RedditCloneModeratorAtSummaryTransformer.transform(
      log.moderator,
    );
    let target:
      | IRedditCloneContentPost.ISummary
      | IRedditCloneContentComment.ISummary
      | null = null;
    if (log.target_type === "post" && log.post) {
      target = await RedditCloneContentPostAtSummaryTransformer.transform(
        log.post,
      );
    } else if (log.target_type === "comment" && log.comment) {
      target = await RedditCloneContentCommentAtSummaryTransformer.transform(
        log.comment,
      );
    }
    return {
      id: log.id,
      moderator,
      target,
      targetType: typia.assert<"post" | "comment">(log.target_type),
      actionType: typia.assert<
        | "delete_post"
        | "delete_comment"
        | "ban_user"
        | "unban_user"
        | "approve_report"
        | "dismiss_report"
      >(log.action_type),
      reason: log.reason ?? null,
      createdAt: log.created_at.toISOString(),
    };
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedLogs,
  };
}
