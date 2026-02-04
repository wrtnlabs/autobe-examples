import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOwner";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationLog";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderation_logs_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account to generate content
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
      },
    });
  typia.assert(member);
  // Step 2: Create a community
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Create a post by the member in the community
  const post: ICommunityPlatformPost =
    await generate_random_community_platform_member_communities_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          text: RandomGenerator.content({ paragraphs: 2 }),
        },
        params: {
          communityName: community.community_code,
        },
      },
    );
  typia.assert(post);
  // Step 4: Create a moderator account with a predictable password
  const modPassword = typia.random<string & tags.MinLength<8>>();
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: moderatorEmail,
        password: modPassword,
      },
    });
  typia.assert(moderator);
  // Step 5: Log in as moderator with the password we just created
  const moderatorAuthConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorAuthConnection, {
    body: {
      email: moderatorEmail,
      password: modPassword,
    },
  });
  // Step 6: Retrieve moderation logs endpoint
  // We cannot create reports (no API endpoint exists), so we test retrieval
  // with empty filter to confirm moderator has access
  const logsResponse: IPageICommunityPlatformModerationLog =
    await api.functional.communityPlatform.moderator.moderation.moderation_logs.index(
      moderatorAuthConnection,
      {
        body: {} satisfies ICommunityPlatformModerationLog.IRequest,
      },
    );
  typia.assert(logsResponse);
  // Step 7: Validate the response structure and empty result
  TestValidator.equals(
    "pagination should have 0 records",
    logsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination should have 0 items",
    logsResponse.data.length,
    0,
  );
  TestValidator.equals(
    "pagination should start at page 1",
    logsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination should use default limit of 20",
    logsResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination should show 1 page",
    logsResponse.pagination.pages,
    1,
  );
  // Step 8: Validate we can retrieve logs with a specific moderator ID
  // To test moderator filtering, we'd need a moderator ID from our created moderator
  const moderatorRequest: ICommunityPlatformModerationLog.IRequest = {
    moderatorId: moderator.id,
  };
  const logsByModeratorResponse: IPageICommunityPlatformModerationLog =
    await api.functional.communityPlatform.moderator.moderation.moderation_logs.index(
      moderatorAuthConnection,
      {
        body: moderatorRequest satisfies ICommunityPlatformModerationLog.IRequest,
      },
    );
  typia.assert(logsByModeratorResponse);
  TestValidator.equals(
    "moderator-filtered logs should have 0 records",
    logsByModeratorResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "moderator-filtered logs should have 0 items",
    logsByModeratorResponse.data.length,
    0,
  );
  // Confirm moderator can access endpoint and get reasonable responses
  // Even though no logs exist, returning a 200 with empty data is correct behavior
  // The test validates that the moderator has access to the endpoint and the API behaves as expected
  // This is the only feasible way to test the scenario given the API constraints
}
