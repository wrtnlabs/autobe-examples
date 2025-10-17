import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test submitting a content report with multiple violation categories.
 *
 * This test validates that the content reporting system can properly handle
 * reports with multiple violation categories selected, enabling users to
 * accurately describe complex rule violations that span multiple categories.
 *
 * Test workflow:
 *
 * 1. Create a member account for creating the reported content
 * 2. Create a community to provide context for the content
 * 3. Create a post that will be reported
 * 4. Submit a content report with multiple violation categories
 * 5. Validate the report correctly captures all selected categories
 */
export async function test_api_content_report_multiple_violation_categories(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for creating the reported content
  const memberData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<20> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create a community to provide context for the content
  const communityCode = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<25> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const communityData = {
    code: communityCode,
    name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
    description: typia.random<
      string & tags.MinLength<10> & tags.MaxLength<500>
    >(),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // Step 3: Create a post that will be reported
  const postTypes = ["text", "link", "image"] as const;
  const selectedPostType = RandomGenerator.pick(postTypes);

  const postData = {
    community_id: community.id,
    type: selectedPostType,
    title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
    body:
      selectedPostType === "text"
        ? typia.random<string & tags.MaxLength<40000>>()
        : undefined,
    url:
      selectedPostType === "link"
        ? typia.random<string & tags.MaxLength<2000>>()
        : undefined,
    image_url:
      selectedPostType === "image" ? typia.random<string>() : undefined,
    caption:
      selectedPostType === "image"
        ? typia.random<string & tags.MaxLength<10000>>()
        : undefined,
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // Step 4: Submit a content report with multiple violation categories
  const multipleCategories = "spam,harassment,hate_speech";

  const reportData = {
    reported_post_id: post.id,
    community_id: community.id,
    content_type: "post",
    violation_categories: multipleCategories,
    additional_context: typia.random<string & tags.MaxLength<500>>(),
  } satisfies IRedditLikeContentReport.ICreate;

  const report: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(connection, {
      body: reportData,
    });
  typia.assert(report);

  // Step 5: Validate the report correctly captures all selected categories
  TestValidator.equals(
    "content type should be post",
    report.content_type,
    "post",
  );
  TestValidator.equals(
    "violation categories should match submitted categories",
    report.violation_categories,
    multipleCategories,
  );
  TestValidator.equals(
    "report status should be pending",
    report.status,
    "pending",
  );
  TestValidator.predicate(
    "report should not be anonymous",
    report.is_anonymous_report === false,
  );
}
