import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getRedditCommunityAdminRedditCommunityMembersId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityMember> {
  const { id } = props;

  const member =
    await MyGlobal.prisma.reddit_community_members.findUniqueOrThrow({
      where: { id },
      include: {
        reddit_community_community_moderators: true,
        reddit_community_posts: true,
        reddit_community_comments: true,
        reddit_community_post_votes: true,
        reddit_community_comment_votes: true,
        reddit_community_user_karma: true,
        reddit_community_community_subscriptions: true,
        reddit_community_reports_of_reporter_member_id: true,
        reddit_community_reports_of_reported_member_id: true,
        reddit_community_report_actions: true,
        reddit_community_user_profiles: true,
      },
    });

  return {
    id: member.id,
    email: member.email,
    password_hash: member.password_hash,
    is_email_verified: member.is_email_verified,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,

    reddit_community_community_moderators:
      member.reddit_community_community_moderators.map((x) => ({
        ...x,
        created_at: toISOStringSafe(x.created_at),
        updated_at: toISOStringSafe(x.updated_at),
        assigned_at: toISOStringSafe(x.assigned_at),
      })),
    reddit_community_posts: member.reddit_community_posts.map((x) => ({
      ...x,
      created_at: toISOStringSafe(x.created_at),
      updated_at: toISOStringSafe(x.updated_at),
      deleted_at: x.deleted_at ? toISOStringSafe(x.deleted_at) : null,
    })),
    reddit_community_comments: member.reddit_community_comments.map((x) => ({
      ...x,
      created_at: toISOStringSafe(x.created_at),
      updated_at: toISOStringSafe(x.updated_at),
      deleted_at: x.deleted_at ? toISOStringSafe(x.deleted_at) : null,
    })),
    reddit_community_post_votes: member.reddit_community_post_votes.map(
      (x) => ({
        ...x,
        created_at: toISOStringSafe(x.created_at),
        updated_at: toISOStringSafe(x.updated_at),
        deleted_at: x.deleted_at ? toISOStringSafe(x.deleted_at) : null,
      }),
    ),
    reddit_community_comment_votes: member.reddit_community_comment_votes.map(
      (x) => ({
        ...x,
        created_at: toISOStringSafe(x.created_at),
        updated_at: toISOStringSafe(x.updated_at),
        deleted_at: x.deleted_at ? toISOStringSafe(x.deleted_at) : null,
      }),
    ),
    reddit_community_user_karma: member.reddit_community_user_karma
      ? {
          ...member.reddit_community_user_karma,
          created_at: toISOStringSafe(
            member.reddit_community_user_karma.created_at,
          ),
          updated_at: toISOStringSafe(
            member.reddit_community_user_karma.updated_at,
          ),
          deleted_at: member.reddit_community_user_karma.deleted_at
            ? toISOStringSafe(member.reddit_community_user_karma.deleted_at)
            : null,
        }
      : undefined,
    reddit_community_community_subscriptions:
      member.reddit_community_community_subscriptions.map((x) => ({
        ...x,
        created_at: toISOStringSafe(x.created_at),
        updated_at: toISOStringSafe(x.updated_at),
        deleted_at: x.deleted_at ? toISOStringSafe(x.deleted_at) : null,
      })),
    reddit_community_reports_of_reporter_member_id:
      member.reddit_community_reports_of_reporter_member_id.map((x) => ({
        ...x,
        created_at: toISOStringSafe(x.created_at),
        updated_at: toISOStringSafe(x.updated_at),
        deleted_at: x.deleted_at ? toISOStringSafe(x.deleted_at) : null,
      })),
    reddit_community_reports_of_reported_member_id:
      member.reddit_community_reports_of_reported_member_id.map((x) => ({
        ...x,
        created_at: toISOStringSafe(x.created_at),
        updated_at: toISOStringSafe(x.updated_at),
        deleted_at: x.deleted_at ? toISOStringSafe(x.deleted_at) : null,
      })),
    reddit_community_report_actions: member.reddit_community_report_actions.map(
      (x) => ({
        ...x,
        created_at: toISOStringSafe(x.created_at),
        updated_at: toISOStringSafe(x.updated_at),
        deleted_at: x.deleted_at ? toISOStringSafe(x.deleted_at) : null,
      }),
    ),
    reddit_community_user_profiles: member.reddit_community_user_profiles
      ? {
          ...member.reddit_community_user_profiles,
          created_at: toISOStringSafe(
            member.reddit_community_user_profiles.created_at,
          ),
          updated_at: toISOStringSafe(
            member.reddit_community_user_profiles.updated_at,
          ),
          deleted_at: member.reddit_community_user_profiles.deleted_at
            ? toISOStringSafe(member.reddit_community_user_profiles.deleted_at)
            : null,
          join_date: toISOStringSafe(
            member.reddit_community_user_profiles.join_date,
          ),
        }
      : undefined,
  };
}
