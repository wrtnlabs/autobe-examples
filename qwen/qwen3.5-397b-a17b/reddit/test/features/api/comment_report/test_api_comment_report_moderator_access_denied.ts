import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentReport";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_comments_reports_create } from "../../../generate/generate_random_reddit_community_member_comments_reports_create";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_communities_moderators_create } from "../../../generate/generate_random_reddit_community_member_communities_moderators_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_report } from "../../../prepare/prepare_random_reddit_community_comment_report";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_moderator } from "../../../prepare/prepare_random_reddit_community_moderator";

/**
 * Test authorization enforcement where a moderator attempts to view comment reports
 * for a community they do not moderate.
 *
 * Setup:
 * 1. Create moderator member account
 * 2. Create reporter member account
 * 3. Create first community (moderator will moderate this)
 * 4. Create second community (moderator will NOT moderate this)
 * 5. Appoint member as moderator of first community only
 * 6. Create post in second community
 * 7. Create comment on that post
 * 8. Report the comment in second community
 *
 * Execution:
 * - Authenticate as the moderator
 * - Call the reports endpoint with the second community name (where they are not a moderator)
 *
 * Validation:
 * - Verify the request is rejected with authorization error
 * - System must enforce community scope - moderators can only see reports for communities they moderate
 */
export async function test_api_comment_report_moderator_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator member account
  const moderatorAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(moderatorAuth);
  const moderatorConnection: api.IConnection = { host: connection.host };
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuth.token.access}`,
  };
  // 2. Create reporter member account
  const reporterAuth = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(reporterAuth);
  const reporterConnection: api.IConnection = { host: connection.host };
  reporterConnection.headers = {
    Authorization: `Bearer ${reporterAuth.token.access}`,
  };
  // 3. Create first community (moderator will moderate this)
  const firstCommunity =
    await generate_random_reddit_community_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(firstCommunity);
  // 4. Create second community (moderator will NOT moderate this)
  const secondCommunity =
    await generate_random_reddit_community_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(secondCommunity);
  // 5. Appoint member as moderator of first community only
  await generate_random_reddit_community_member_communities_moderators_create(
    moderatorConnection,
    {
      params: { communityName: firstCommunity.name },
      body: {
        member_id: moderatorAuth.id,
      } satisfies IRedditCommunityModerator.ICreate,
    },
  );
  // 6. Create post in second community (where moderator is NOT a moderator)
  const post = await api.functional.redditCommunity.member.posts.create(
    reporterConnection,
    {
      body: {
        title: RandomGenerator.name(),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 7. Create comment on that post
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      reporterConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  // 8. Report the comment in second community
  await generate_random_reddit_community_member_comments_reports_create(
    reporterConnection,
    {
      params: { commentId: comment.id },
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditCommunityCommentReport.ICreate,
    },
  );
  // 9. Try to access reports for second community as moderator - should fail
  await TestValidator.error(
    "moderator cannot access reports for non-moderated community",
    async () => {
      await api.functional.redditCommunity.member.communities.reports.index(
        moderatorConnection,
        {
          communityName: secondCommunity.name,
          body: {} satisfies IRedditCommunityCommentReport.IRequest,
        },
      );
    },
  );
}
