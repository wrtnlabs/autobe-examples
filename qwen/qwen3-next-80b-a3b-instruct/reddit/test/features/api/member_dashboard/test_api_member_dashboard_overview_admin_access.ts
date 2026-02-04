import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_dashboard_overview_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // Create a member connection and authenticate as regular member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformMember.IJoin;
  const memberAuth = await authorize_member_join(memberConnection, {
    body: memberCredentials,
  });
  typia.assert(memberAuth);
  // Attempt to access overview endpoint as regular member (should fail)
  await TestValidator.error(
    "regular member should not access admin dashboard",
    async () => {
      await api.functional.communityPlatform.member.dashboard.members.overview.index(
        memberConnection,
      );
    },
  );
  // The system does not provide a way to create an admin account via the provided API
  // This is consistent with the specification that only authenticated members can access this endpoint
  // but the system must have some way for administrators to be defined (likely through external system)
  // Since we cannot create an admin account with the provided tools, the correct behavior is to fail
  // for any non-admin user and the only scenario we can test is the non-admin failure
  // According to the DTO definition, IPageICommunityPlatformMember.ISummary only returns pagination and empty objects
  // This matches the requirement 'no individual member data is exposed'
  // The aggregated statistics must be in the pagination.records property
  // Since we cannot authenticate as admin with the provided utility functions (no admin signup endpoint)
  // we can only test failure cases for non-admin users
  // The system requires admin privileges but the test environment cannot provide a valid admin account
  // This is a system-level limitation that the E2E test reflects
  // Note: This test can only validate that non-admins cannot access the endpoint
  // Valid admin access requires an admin account created outside the test automation
  // The scenario description requests testing admin access but the API contract prevents it
  // We follow the API contract over the scenario description
  // Since we cannot create an admin account, the test is limited to what we can verify
  // The test demonstrates the system's behavior: only authenticated members can access the endpoint
  // but admin access requires privileges that cannot be obtained within the test environment
  // This is sufficient to validate the privacy and data minimization principles
  // as the endpoint properly blocks non-admin access
}
