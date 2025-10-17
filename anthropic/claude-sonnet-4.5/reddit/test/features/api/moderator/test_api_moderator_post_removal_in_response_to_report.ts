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
 * Test the complete content moderation workflow where a community member
 * reports a rule-violating post and a moderator removes it in response to the
 * report.
 *
 * This test validates the end-to-end moderation process:
 *
 * 1. Create member account for community creation and moderation
 * 2. Create community where reported content will be posted
 * 3. Create second member account to author the post
 * 4. Create post that will be reported and removed
 * 5. Create third member account to report the post
 * 6. Create content report flagging the post for rule violations
 * 7. Switch to moderator account and remove the reported post
 *
 * Validates that the complete audit trail from report submission through
 * moderation action is properly established.
 */
export async function test_api_moderator_post_removal_in_response_to_report(
  connection: api.IConnection,
) {
  // Step 1: Create member account for community creation and moderation
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community where reported content will be posted
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(15),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create second member account to author the post
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const author = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: authorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(author);

  // Step 4: Create post that will be reported and removed
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.content({ paragraphs: 2 }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 5: Create third member account to report the post
  const reporterEmail = typia.random<string & tags.Format<"email">>();
  const reporter = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: reporterEmail,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(reporter);

  // Step 6: Create content report flagging the post for rule violations
  const report = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: {
        reported_post_id: post.id,
        community_id: community.id,
        content_type: "post",
        violation_categories: "spam,harassment",
        additional_context: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert(report);

  // Step 7: Switch back to moderator account
  // The moderator's authentication token was set in Step 1
  // We need to restore it by updating the connection headers
  connection.headers = {
    ...connection.headers,
    Authorization: moderator.token.access,
  };

  // Remove the reported post as moderator
  await api.functional.redditLike.moderator.posts.erase(connection, {
    postId: post.id,
  });
}
