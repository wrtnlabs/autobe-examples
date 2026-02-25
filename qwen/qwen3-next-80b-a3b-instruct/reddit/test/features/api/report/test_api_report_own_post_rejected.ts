import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

export async function test_api_report_own_post_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for reporting own post
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData: IRedditCommunityMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
  } satisfies IRedditCommunityMember.IJoin;
  const member: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: memberData });
  // 2. Create a post as the member in a pre-existing community
  const postConnection: api.IConnection = { host: connection.host };
  // Reuse the same token from member connection
  postConnection.headers = { ...memberConnection.headers };
  // Use a known community ID that is pre-seeded in the test environment
  const communityId = "f0000000-0000-0000-0000-000000000000";
  const postBody: IRedditCommunityPost.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    community_id: communityId,
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
    }),
  } satisfies IRedditCommunityPost.ICreate;
  const createdPost = await api.functional.redditCommunity.member.posts.create(
    postConnection,
    { body: postBody },
  );
  typia.assert(createdPost);
  // 3. Attempt to report own post - this should be rejected with 403 Forbidden
  const reportConnection: api.IConnection = { host: connection.host };
  reportConnection.headers = { ...memberConnection.headers };
  const reportBody: IRedditCommunityReport.ICreate = {
    reason: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    postId: createdPost.id,
  } satisfies IRedditCommunityReport.ICreate;
  // Expect 403 Forbidden for self-reporting
  await TestValidator.httpError(
    "Reporting own post should be rejected with 403 Forbidden",
    403,
    async () => {
      await api.functional.redditCommunity.member.reports.create(
        reportConnection,
        { body: reportBody },
      );
    },
  );
}
