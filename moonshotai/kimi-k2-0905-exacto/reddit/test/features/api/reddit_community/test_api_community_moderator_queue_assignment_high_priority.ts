import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationQueue";
import type { IRedditCommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformModerator";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

export async function test_api_community_moderator_queue_assignment_high_priority(
  connection: api.IConnection,
) {
  // Step 1: Create community moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorNickname = RandomGenerator.name();
  const moderator = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        nickname: moderatorNickname,
        password: "moderator123",
        href: "https://reddit-community.com/join",
        referrer: "https://reddit-community.com",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderator);

  // Step 2: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      nickname: RandomGenerator.name(),
      password: "member123",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Create test post
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "member123",
      href: "https://reddit-community.com/login",
      referrer: "https://reddit-community.com",
    } satisfies IRedditCommunityMember.ILoginRequest,
  });

  const communityId = typia.random<string & tags.Format<"uuid">>();
  const postTypeId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: "test post for high-priority content report",
        content: "this is a test post with content that might be reported",
        reddit_community_id: communityId,
        reddit_post_type_id: postTypeId,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 4: Create content report
  const report =
    await api.functional.redditCommunity.member.contentReports.create(
      connection,
      {
        body: {
          report_reason:
            "test content report for high-priority queue assignment",
          report_category: "harassment",
          content_type: "post",
          post_id: post.id,
        } satisfies IRedditCommunityContentReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 5: Switch to community moderator
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      href: "https://reddit-community.com/login",
      referrer: "https://reddit-community.com",
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 6: Update moderation queue entry with high priority assignment
  const updatedQueue =
    await api.functional.redditCommunity.communityModerator.moderationQueue.update(
      connection,
      {
        queueId: report.id,
        body: {
          priority: "high",
          status: "in_review",
          business_status: "reviewing",
          assigned_at: new Date().toISOString(),
          due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          notes: "high-priority content report under review",
        } satisfies IRedditCommunityModerationQueue.IUpdate,
      },
    );
  typia.assert(updatedQueue);

  // Step 7: Validate queue entry updates
  TestValidator.equals(
    "queue priority should be high",
    updatedQueue.priority,
    "high",
  );
  TestValidator.equals(
    "queue status should be in_review",
    updatedQueue.status,
    "in_review",
  );
  TestValidator.equals(
    "business status should be reviewing",
    updatedQueue.business_status,
    "reviewing",
  );
  TestValidator.predicate(
    "assigned_at should be set",
    updatedQueue.assigned_at !== null,
  );
  TestValidator.predicate(
    "due_date should be set",
    updatedQueue.due_date !== null,
  );
  TestValidator.equals(
    "notes should match",
    updatedQueue.notes,
    "high-priority content report under review",
  );
}
