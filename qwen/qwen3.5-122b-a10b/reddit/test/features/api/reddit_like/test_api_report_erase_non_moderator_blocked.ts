import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import type { IRedditLikeReportOfComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportOfComment";
import type { IRedditLikeReportOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportOfPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

/**
 * Test that non-moderators cannot delete content reports.
 *
 * Validates the authorization control preventing regular members from deleting reports they created. Only community moderators and owners should have the ability to manage reports through the erase endpoint.
 *
 * The test follows a complete workflow with two distinct members:
 * 1. First member creates a community and becomes the owner
 * 2. First member creates a post in the community
 * 3. Second member (not a moderator) creates a report on the post
 * 4. Second member attempts to delete the report
 * 5. Validates that the deletion fails with 403 Forbidden
 *
 * 1. First member registers and authenticates
 * 1.1. Create connection for first member
 * 1.2. Register with unique credentials
 * 1.3. Store authorization token
 *
 * 2. First member creates a community
 * 2.1. Create community with unique name
 * 2.2. Verify community ownership
 *
 * 3. First member creates a post
 * 3.1. Create text post in the community
 * 3.2. Verify post creation
 *
 * 4. Second member registers and authenticates
 * 4.1. Create separate connection for second member
 * 4.2. Register with different credentials
 * 4.3. Ensure NOT added as moderator
 *
 * 5. Second member creates a report
 * 5.1. Report the post created by first member
 * 5.2. Verify report creation with pending status
 *
 * 6. Second member attempts to delete the report
 * 6.1. Call erase endpoint with report ID
 * 6.2. Expect HttpError with 403 Forbidden status
 * 6.3. Validate error message indicates authorization failure
 *
 * 7. Verify report still exists
 * 7.1. Confirm report was not deleted
 * 7.2. Report remains in moderation queue
 */
export async function test_api_report_erase_non_moderator_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member registers and authenticates
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(firstMember);
  // 2. First member creates a community
  const community = await generate_random_reddit_like_member_communities_create(
    firstMemberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. First member creates a post in the community
  const post = await generate_random_reddit_like_member_posts_create(
    firstMemberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Second member registers and authenticates (NOT a moderator)
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(secondMember);
  // 5. Second member creates a report on the post
  const report = await generate_random_reddit_like_member_reports_create(
    secondMemberConnection,
    {
      body: {
        targetType: "post",
        targetId: post.id,
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // 6. Second member attempts to delete the report (should fail with 403)
  await TestValidator.httpError(
    "non-moderator cannot delete report",
    403,
    async () => {
      await api.functional.redditLike.member.reports.erase(
        secondMemberConnection,
        {
          reportId: report.id,
        },
      );
    },
  );
}
