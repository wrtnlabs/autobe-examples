import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that unauthorized access attempts are properly rejected.
 * Attempt to access the profile endpoint without authentication or with invalid/expired tokens.
 * Verify that the system returns appropriate authentication error (401 Unauthorized)
 * and does not leak any member information.
 * This edge case validates that the profile endpoint correctly enforces member-only access
 * as specified by authorizationActor='member'.
 * The test should confirm that without valid member authentication, the endpoint refuses
 * access entirely, protecting private profile data including email address.
 */
export async function test_api_member_profile_requires_authentication(
  connection: api.IConnection,
): Promise<void> {
  // First, create a member account to establish valid authentication context
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // Test 1: Attempt to access profile without any authentication (no headers)
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // Explicitly clear any headers to simulate no authentication
  unauthenticatedConnection.headers = {};
  await TestValidator.error(
    "profile access without authentication should fail",
    async () =>
      await api.functional.communityPlatform.member.profile.at(
        unauthenticatedConnection,
      ),
  );
  // Test 2: Attempt to access profile with empty/invalid token
  const invalidTokenConnection: api.IConnection = { host: connection.host };
  invalidTokenConnection.headers = {
    Authorization: "Bearer invalid-token-123",
  };
  await TestValidator.error(
    "profile access with invalid token should fail",
    async () =>
      await api.functional.communityPlatform.member.profile.at(
        invalidTokenConnection,
      ),
  );
  // Test 3: Attempt to access profile with malformed authorization header
  const malformedConnection: api.IConnection = { host: connection.host };
  malformedConnection.headers = {
    Authorization: "InvalidFormat",
  };
  await TestValidator.error(
    "profile access with malformed header should fail",
    async () =>
      await api.functional.communityPlatform.member.profile.at(
        malformedConnection,
      ),
  );
  // Test 4: Verify that valid authentication works and returns profile
  // The memberConnection already has proper authorization headers from authorize_member_join
  const profile =
    await api.functional.communityPlatform.member.profile.at(memberConnection);
  typia.assert(profile);
  // Validate that the returned profile matches the authenticated member
  TestValidator.equals(
    "profile ID should match authenticated member ID",
    profile.id,
    authorized.id,
  );
  TestValidator.equals(
    "profile email should match authenticated member email",
    profile.email,
    authorized.email,
  );
  TestValidator.equals(
    "profile username should match authenticated member username",
    profile.username,
    authorized.username,
  );
}
