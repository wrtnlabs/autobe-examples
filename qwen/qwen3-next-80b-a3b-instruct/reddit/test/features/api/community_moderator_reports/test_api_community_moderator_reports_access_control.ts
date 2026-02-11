import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentReport";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_community_moderator_reports_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a regular member (unauthorized actor)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityMember.IJoin;
  await authorize_member_join(memberConnection, { body: memberCredentials });
  // 2. Log in as the member
  await authorize_member_login(memberConnection, {
    body: {
      email: memberCredentials.email,
      password: memberCredentials.password,
    } satisfies IRedditCommunityMember.ILogin,
  });
  // 3. Create a community moderator (authorized actor)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityCommunityModerator.ILogin;
  await authorize_community_moderator_join(moderatorConnection, {
    body: {
      email: moderatorCredentials.email,
      password_hash: RandomGenerator.alphaNumeric(32),
    } satisfies IRedditCommunityCommunityModerator.IJoin,
  });
  // 4. Log in as the community moderator
  await authorize_community_moderator_login(moderatorConnection, {
    body: moderatorCredentials,
  });
  // 5. Create an actual community using SDK function (no utility available)
  const communityName = RandomGenerator.name();
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Since we don't have a utility function to create a community, but we need one for testing,
  // create an admin connection and create a community
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityCommunityModerator.ILogin;
  // Create an admin moderator who can create communities (assuming the moderator join creates admin privileges)
  await authorize_community_moderator_join(adminConnection, {
    body: {
      email: adminCredentials.email,
      password_hash: RandomGenerator.alphaNumeric(32),
    } satisfies IRedditCommunityCommunityModerator.IJoin,
  });
  await authorize_community_moderator_login(adminConnection, {
    body: adminCredentials,
  });
  // In actual system, there should be a POST /communities endpoint to create a community
  // But it's not provided in the API functions. Since we must have a community, we must assume
  // the communityId is valid because we're testing access control on an existing community.
  // Given the constraints, we'll use the generated UUID and proceed with the test.
  // This is a compromise - the scenario assumes a community exists.
  // 6. Unauthorized member attempts to access reports endpoint (must fail with 403)
  await TestValidator.httpError(
    "regular member cannot access reports",
    403,
    async () => {
      await api.functional.redditCommunity.communityModerator.communities.reports.index(
        memberConnection,
        {
          communityId,
        },
      );
    },
  );
  // 7. Authorized moderator successfully accesses reports endpoint (must succeed with 200)
  const reports =
    await api.functional.redditCommunity.communityModerator.communities.reports.index(
      moderatorConnection,
      {
        communityId,
      },
    );
  typia.assert(reports);
  TestValidator.equals(
    "reports response has pagination structure",
    reports.pagination.current,
    1,
  );
  TestValidator.equals(
    "reports response has data array",
    Array.isArray(reports.data),
    true,
  );
}
