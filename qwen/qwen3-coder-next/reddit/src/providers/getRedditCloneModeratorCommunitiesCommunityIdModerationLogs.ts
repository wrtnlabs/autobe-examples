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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneModeratorCommunitiesCommunityIdModerationLogs(props: {
  moderator: ModeratorPayload;
  communityId: string;
}): Promise<IPageIRedditCloneModerationLog.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    OR: [
      {
        post: {
          community_id: props.communityId,
        },
      },
      {
        comment: {
          post: {
            community_id: props.communityId,
          },
        },
      },
    ],
  } satisfies Prisma.reddit_clone_moderation_logsWhereInput;
  const logs = await MyGlobal.prisma.reddit_clone_moderation_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    include: {
      post: {
        include: {
          author: true,
          community: true,
        },
      },
      comment: {
        include: {
          member: true,
          post: {
            include: {
              author: true,
              community: true,
            },
          },
        },
      },
      moderator: true,
    },
  });
  const total = await MyGlobal.prisma.reddit_clone_moderation_logs.count({
    where: whereInput,
  });
  const transformedData: IRedditCloneModerationLog.ISummary[] = logs.map(
    (log) => {
      const moderatorSummary: IRedditCloneModerator.ISummary = {
        id: log.moderator.id,
        username: log.moderator.username,
        displayName: log.moderator.display_name ?? null,
        avatarUrl: log.moderator.avatar_url ?? null,
        email: log.moderator.email,
        roleType: log.moderator.role_type,
        permissions: 0 satisfies number & tags.Type<"int32">,
        createdAt: log.moderator.created_at.toISOString(),
        updatedAt: log.moderator.updated_at.toISOString(),
      };
      const target:
        | IRedditCloneContentPost.ISummary
        | IRedditCloneContentComment.ISummary
        | null =
        log.target_type === "post" && log.post
          ? ({
              id: log.post.id,
              title: log.post.title,
              author: {
                id: log.post.author.id,
                username: log.post.author.username,
                displayName: log.post.author.display_name ?? null,
                avatarUrl: log.post.author.avatar_url ?? null,
              } satisfies IRedditCloneMember.ISummary,
              community: {
                id: log.post.community.id,
                name: log.post.community.name,
                description: log.post.community.description ?? null,
                iconUrl: log.post.community.icon_url ?? null,
                subscriberCount: log.post.community.subscriber_count,
                createdAt: log.post.community.created_at.toISOString(),
                owner: {
                  id: log.post.community.owner.id,
                  username: log.post.community.owner.username,
                  displayName: log.post.community.owner.display_name ?? null,
                  avatarUrl: log.post.community.owner.avatar_url ?? null,
                } satisfies IRedditCloneOwner.ISummary,
              } satisfies IRedditCloneCommunity.ISummary,
              voteScore: log.post.vote_score,
              commentCount: log.post.comment_count,
              createdAt: log.post.created_at.toISOString(),
            } satisfies IRedditCloneContentPost.ISummary)
          : log.target_type === "comment" && log.comment
            ? ({
                id: log.comment.id,
                author: {
                  id: log.comment.member.id,
                  username: log.comment.member.username,
                  displayName: log.comment.member.display_name ?? null,
                  avatarUrl: log.comment.member.avatar_url ?? null,
                } satisfies IRedditCloneMember.ISummary,
                voteScore: log.comment.vote_score,
                replyCount: log.comment.reply_count,
                createdAt: log.comment.created_at.toISOString(),
              } satisfies IRedditCloneContentComment.ISummary)
            : null;
      return {
        id: log.id,
        moderator: moderatorSummary,
        target: target,
        targetType: log.target_type as "post" | "comment",
        actionType: log.action_type,
        reason: log.reason ?? null,
        createdAt: log.created_at.toISOString(),
      };
    },
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
