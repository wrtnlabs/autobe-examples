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
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
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
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_comment_report } from "../../../prepare/prepare_random_reddit_community_comment_report";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_comment_report_moderator_list_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
  const ownerUsername = RandomGenerator.name(1);
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: ownerUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(ownerAuth);
  // 2. Create a community (owner becomes moderator by default)
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create second member account (will create post and comment)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member2Auth);
  // 4. Subscribe owner to their own community
  await api.functional.redditCommunity.member.communities.subscription.create(
    ownerConnection,
    {
      communityName: community.name,
    },
  );
  // 5. Subscribe second member to the community
  await api.functional.redditCommunity.member.communities.subscription.create(
    member2Connection,
    {
      communityName: community.name,
    },
  );
  // 6. Create a post in the community (as second member)
  const post = await api.functional.redditCommunity.member.posts.create(
    member2Connection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 7. Create a comment on the post (as second member)
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      member2Connection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 8. Create third member account (will file the report)
  const member3Username = RandomGenerator.name(1);
  const member3Connection: api.IConnection = { host: connection.host };
  const member3Auth = await authorize_member_join(member3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: member3Username,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member3Auth);
  // 9. Subscribe third member to the community
  await api.functional.redditCommunity.member.communities.subscription.create(
    member3Connection,
    {
      communityName: community.name,
    },
  );
  // 10. Create a comment report (as third member)
  const reportReason = RandomGenerator.paragraph({ sentences: 2 });
  const report =
    await generate_random_reddit_community_member_comments_reports_create(
      member3Connection,
      {
        body: {
          reason: reportReason,
        },
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(report);
  // 11. Call the comment reports list endpoint (as owner/moderator)
  const reportsResponse =
    await api.functional.redditCommunity.member.communities.comment_reports.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityCommentReport.IRequest,
      },
    );
  typia.assert(reportsResponse);
  // 12. Validate the response contains the created report
  TestValidator.predicate(
    "reports array not empty",
    reportsResponse.data.length > 0,
  );
  const createdReport = reportsResponse.data.find((r) => r.id === report.id);
  TestValidator.predicate(
    "created report found in list",
    createdReport !== undefined,
  );
  if (createdReport) {
    TestValidator.equals(
      "report status is PENDING",
      createdReport.status,
      "PENDING",
    );
    TestValidator.equals(
      "report reason matches",
      createdReport.reason,
      reportReason,
    );
    TestValidator.equals(
      "reporter username matches",
      createdReport.reporter.username,
      member3Username,
    );
    TestValidator.equals(
      "comment id matches",
      createdReport.comment.id,
      comment.id,
    );
    TestValidator.equals(
      "comment content matches",
      createdReport.comment.content,
      comment.content,
    );
  }
  // 13. Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    reportsResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit is 20", reportsResponse.pagination.limit, 20);
  TestValidator.equals(
    "total records is 1",
    reportsResponse.pagination.records,
    1,
  );
  TestValidator.equals("total pages is 1", reportsResponse.pagination.pages, 1);
}
