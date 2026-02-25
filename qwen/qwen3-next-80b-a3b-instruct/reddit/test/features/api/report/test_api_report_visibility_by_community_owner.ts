import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

export async function test_api_report_visibility_by_community_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner account
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  const ownerData: IRedditCommunityCommunityOwner.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
  };
  await authorize_community_owner_join(communityOwnerConnection, {
    body: ownerData,
  });
  // 2. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData: IRedditCommunityMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
  };
  await authorize_member_join(memberConnection, { body: memberData });
  // 3. Member logs in
  await authorize_member_login(memberConnection, {
    body: {
      email: memberData.email,
      password: memberData.password,
    } satisfies IRedditCommunityMember.ILogin,
  });
  // 4. Member creates a post in community
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Member submits report on the post
  const report = await generate_random_reddit_community_member_reports_create(
    memberConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        postId: post.id,
      } satisfies IRedditCommunityReport.ICreate,
    },
  );
  typia.assert(report);
  // 6. Community owner logs in
  await authorize_community_owner_login(communityOwnerConnection, {
    body: {
      email: ownerData.email,
      password: ownerData.password,
    } satisfies IRedditCommunityCommunityOwner.ILogin,
  });
  // 7. Community owner retrieves the report
  const retrievedReport =
    await api.functional.redditCommunity.communityOwner.reports.at(
      communityOwnerConnection,
      {
        reportId: report.id,
      },
    );
  typia.assert(retrievedReport);
  // 8. Validate report structure
  TestValidator.equals(
    "report status is pending",
    retrievedReport.status,
    "pending",
  );
  TestValidator.equals(
    "reporter username matches",
    retrievedReport.reporter.username,
    memberData.username,
  );
  TestValidator.equals(
    "report target is the created post",
    retrievedReport.target.id,
    post.id,
  );
  TestValidator.equals(
    "report reason matches",
    retrievedReport.reason,
    report.reason,
  );
  TestValidator.predicate(
    "resolved_by_user is null",
    () => retrievedReport.resolved_by_user === null,
  );
  TestValidator.predicate(
    "reporter has no private fields",
    () => retrievedReport.reporter.id === undefined,
  );
  TestValidator.predicate("target has only public summary fields", () => {
    const target = retrievedReport.target as IRedditCommunityPost.ISummary;
    return (
      target.id !== undefined &&
      target.title !== undefined &&
      target.author !== undefined &&
      target.community !== undefined &&
      target.voteScore !== undefined &&
      target.commentCount !== undefined &&
      target.createdAt !== undefined &&
      target.updatedAt !== undefined
    );
  });
}
