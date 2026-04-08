import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityReport";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityReport";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_reports_create } from "../../../generate/generate_random_reddit_clone_member_communities_reports_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_reddit_clone_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_reddit_clone_posts_comments_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_report } from "../../../prepare/prepare_random_reddit_clone_community_report";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

export async function test_api_community_reports_filtering_by_status_and_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member1 (community owner)
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {});
  // 2. Create community with member1
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community);
  // 3. Create multiple posts in the community
  const post1 = await generate_random_reddit_clone_member_posts_create(
    member1Connection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post1);
  const post2 = await generate_random_reddit_clone_member_posts_create(
    member1Connection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post2);
  // 4. Create a comment on one post
  const comment =
    await generate_random_reddit_clone_member_reddit_clone_posts_comments_create(
      member1Connection,
      {
        params: { postId: post1.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(comment);
  // 5. Create member2 (reporter) - different user to report content
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {});
  // 6. Report the post with unique keyword for search testing
  const uniqueKeyword = `unique_keyword_${RandomGenerator.alphaNumeric(8)}`;
  const postReport =
    await generate_random_reddit_clone_member_communities_reports_create(
      member2Connection,
      {
        params: { communityId: community.id },
        body: {
          target_id: post1.id,
          target_type: "post",
          reason: `This post contains ${uniqueKeyword} and violates community rules`,
        },
      },
    );
  typia.assert(postReport);
  // 7. Report the comment with different keyword
  const commentKeyword = `comment_spam_${RandomGenerator.alphaNumeric(6)}`;
  const commentReport =
    await generate_random_reddit_clone_member_communities_reports_create(
      member2Connection,
      {
        params: { communityId: community.id },
        body: {
          target_id: comment.id,
          target_type: "comment",
          reason: `Comment is ${commentKeyword} and inappropriate`,
        },
      },
    );
  typia.assert(commentReport);
  // 8. Query reports as moderator (member1 is owner)
  // Filter by status="pending" and targetType="post"
  const pendingPostReports =
    await api.functional.redditClone.member.communities.reports.index(
      member1Connection,
      {
        communityId: community.id,
        body: {
          status: "pending",
          targetType: "post",
        } satisfies IRedditCloneCommunityReport.IRequest,
      },
    );
  typia.assert(pendingPostReports);
  // Validate only post reports with pending status
  TestValidator.equals(
    "has pending post reports",
    pendingPostReports.data.length > 0,
    true,
  );
  TestValidator.equals(
    "all reports are posts",
    pendingPostReports.data.every((r) => r.targetType === "post"),
    true,
  );
  TestValidator.equals(
    "all reports are pending",
    pendingPostReports.data.every((r) => r.status === "pending"),
    true,
  );
  // 9. Filter by status="pending" and targetType="comment"
  const pendingCommentReports =
    await api.functional.redditClone.member.communities.reports.index(
      member1Connection,
      {
        communityId: community.id,
        body: {
          status: "pending",
          targetType: "comment",
        } satisfies IRedditCloneCommunityReport.IRequest,
      },
    );
  typia.assert(pendingCommentReports);
  // Validate only comment reports with pending status
  TestValidator.equals(
    "has pending comment reports",
    pendingCommentReports.data.length > 0,
    true,
  );
  TestValidator.equals(
    "all reports are comments",
    pendingCommentReports.data.every((r) => r.targetType === "comment"),
    true,
  );
  TestValidator.equals(
    "all reports are pending",
    pendingCommentReports.data.every((r) => r.status === "pending"),
    true,
  );
  // 10. Test search parameter with unique keyword
  const searchResults =
    await api.functional.redditClone.member.communities.reports.index(
      member1Connection,
      {
        communityId: community.id,
        body: {
          search: uniqueKeyword,
        } satisfies IRedditCloneCommunityReport.IRequest,
      },
    );
  typia.assert(searchResults);
  // Validate search found the correct report
  TestValidator.equals(
    "search found report with keyword",
    searchResults.data.length > 0,
    true,
  );
  TestValidator.equals(
    "search matches correct target",
    searchResults.data.some((r) => r.targetId === post1.id),
    true,
  );
  // 11. Test pagination metadata
  TestValidator.predicate(
    "has pagination info",
    pendingPostReports.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination has current page",
    pendingPostReports.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    pendingPostReports.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has pages",
    pendingPostReports.pagination.pages >= 1,
  );
  // 12. Test filtering by all statuses (no filter = all)
  const allReports =
    await api.functional.redditClone.member.communities.reports.index(
      member1Connection,
      {
        communityId: community.id,
        body: {} satisfies IRedditCloneCommunityReport.IRequest,
      },
    );
  typia.assert(allReports);
  // Validate all reports are returned when no filter applied
  TestValidator.predicate("returns all reports", allReports.data.length >= 2);
}
