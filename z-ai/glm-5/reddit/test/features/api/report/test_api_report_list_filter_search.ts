import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_report_list_filter_search(
  connection: api.IConnection,
): Promise<void> {
  // Member A joins and creates community (becomes moderator)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // Member B joins and creates post + comment
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberBConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(post);
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberBConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(comment);
  // Member C reports the post with 'Spam content'
  const memberCConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberCConnection, {});
  const postReport =
    await api.functional.communityPlatform.member.reports.create(
      memberCConnection,
      {
        body: {
          community_id: community.id,
          target_type: "post",
          target_id: post.id,
          reason: "Spam content",
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(postReport);
  // Member D reports the comment with 'Harassment language'
  const memberDConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberDConnection, {});
  const commentReport =
    await api.functional.communityPlatform.member.reports.create(
      memberDConnection,
      {
        body: {
          community_id: community.id,
          target_type: "comment",
          target_id: comment.id,
          reason: "Harassment language",
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(commentReport);
  // Test 1: Filter by target_type='post'
  const postReports =
    await api.functional.communityPlatform.member.communities.reports.index(
      memberAConnection,
      {
        communityId: community.id,
        body: {
          target_type: "post",
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(postReports);
  TestValidator.equals(
    "post filter returns 1 report",
    postReports.data.length,
    1,
  );
  TestValidator.equals(
    "post report target_type",
    postReports.data[0].target_type,
    "post",
  );
  TestValidator.predicate(
    "post report has post data",
    postReports.data[0].post !== null,
  );
  TestValidator.equals(
    "post report has no comment data",
    postReports.data[0].comment,
    null,
  );
  // Test 2: Filter by target_type='comment'
  const commentReports =
    await api.functional.communityPlatform.member.communities.reports.index(
      memberAConnection,
      {
        communityId: community.id,
        body: {
          target_type: "comment",
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(commentReports);
  TestValidator.equals(
    "comment filter returns 1 report",
    commentReports.data.length,
    1,
  );
  TestValidator.equals(
    "comment report target_type",
    commentReports.data[0].target_type,
    "comment",
  );
  TestValidator.predicate(
    "comment report has comment data",
    commentReports.data[0].comment !== null,
  );
  TestValidator.equals(
    "comment report has no post data",
    commentReports.data[0].post,
    null,
  );
  // Test 3: Search for 'Spam'
  const spamReports =
    await api.functional.communityPlatform.member.communities.reports.index(
      memberAConnection,
      {
        communityId: community.id,
        body: {
          search: "Spam",
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(spamReports);
  TestValidator.equals(
    "search 'Spam' returns 1 report",
    spamReports.data.length,
    1,
  );
  TestValidator.predicate(
    "report reason contains 'Spam'",
    spamReports.data[0].reason.includes("Spam"),
  );
  // Test 4: Search for 'Harassment'
  const harassmentReports =
    await api.functional.communityPlatform.member.communities.reports.index(
      memberAConnection,
      {
        communityId: community.id,
        body: {
          search: "Harassment",
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(harassmentReports);
  TestValidator.equals(
    "search 'Harassment' returns 1 report",
    harassmentReports.data.length,
    1,
  );
  TestValidator.predicate(
    "report reason contains 'Harassment'",
    harassmentReports.data[0].reason.includes("Harassment"),
  );
}
