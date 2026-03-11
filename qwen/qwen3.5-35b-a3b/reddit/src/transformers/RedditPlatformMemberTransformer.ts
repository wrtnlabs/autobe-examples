import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditPlatformCommentAtSummaryTransformer } from "./RedditPlatformCommentAtSummaryTransformer";
import { RedditPlatformCommentVoteTransformer } from "./RedditPlatformCommentVoteTransformer";
import { RedditPlatformMemberSessionAtSummaryTransformer } from "./RedditPlatformMemberSessionAtSummaryTransformer";
import { RedditPlatformPostAtSummaryTransformer } from "./RedditPlatformPostAtSummaryTransformer";
import { RedditPlatformPostVoteTransformer } from "./RedditPlatformPostVoteTransformer";
import { RedditPlatformReportAtSummaryTransformer } from "./RedditPlatformReportAtSummaryTransformer";

export namespace RedditPlatformMemberTransformer {
  export type Payload = Prisma.reddit_platform_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        username: true,
        display_name: true,
        bio: true,
        avatar_url: true,
        karma_score: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: RedditPlatformMemberSessionAtSummaryTransformer.select(),
        passwordResetTokens: true,
        emailVerifications: true,
        ownedCommunities: true,
        posts: RedditPlatformPostAtSummaryTransformer.select(),
        memberPostVotes: RedditPlatformPostVoteTransformer.select(),
        postSnapshots: true,
        comments: RedditPlatformCommentAtSummaryTransformer.select(),
        commentVotes: RedditPlatformCommentVoteTransformer.select(),
        reports: RedditPlatformReportAtSummaryTransformer.select(),
        resolvedReports: true,
        subscriptions: true,
        moderatorOfCommunities: true,
        moderationAuditLogs: true,
        userModerationAuditLogs: true,
        moderatorHistoryRecords: true,
        moderatorHistoryActions: true,
        bannedUsers: true,
        issuedBans: true,
      },
    } satisfies Prisma.reddit_platform_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformMember> {
    return {
      id: input.id,
      username: input.username,
      display_name: input.display_name,
      bio: input.bio ?? null,
      avatar_url: input.avatar_url ?? null,
      karma_score: input.karma_score,
      is_active: input.is_active,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      sessions: await ArrayUtil.asyncMap(
        input.sessions,
        RedditPlatformMemberSessionAtSummaryTransformer.transform,
      ),
      posts: await ArrayUtil.asyncMap(
        input.posts,
        RedditPlatformPostAtSummaryTransformer.transform,
      ),
      comments: await ArrayUtil.asyncMap(
        input.comments,
        RedditPlatformCommentAtSummaryTransformer.transform,
      ),
      postVotes: await ArrayUtil.asyncMap(
        input.memberPostVotes,
        RedditPlatformPostVoteTransformer.transform,
      ),
      commentVotes: await ArrayUtil.asyncMap(
        input.commentVotes,
        RedditPlatformCommentVoteTransformer.transform,
      ),
      reports: await ArrayUtil.asyncMap(
        input.reports,
        RedditPlatformReportAtSummaryTransformer.transform,
      ),
    } satisfies IRedditPlatformMember;
  }
}
