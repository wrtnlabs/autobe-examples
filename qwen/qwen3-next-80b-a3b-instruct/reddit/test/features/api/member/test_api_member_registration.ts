import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_registration(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Generate realistic test data for member registration
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // Step 2: Create a new connection for the registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 3: Use the authorized registration utility function (MUST use utility function)
  const registeredMember: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email,
        password,
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 4: Validate the registration response structure
  typia.assert(registeredMember);
  // Step 5: Validate member_id is a valid UUID format
  TestValidator.equals(
    "member_id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      registeredMember.member_id,
    ),
    true,
  );
  // Step 6: Validate username has required length constraints (3-50 characters)
  TestValidator.predicate(
    "username length within limits",
    registeredMember.username.length >= 3 &&
      registeredMember.username.length <= 50,
  );
  // Step 7: Validate display_name has required length constraints (1-100 characters)
  TestValidator.predicate(
    "display_name length within limits",
    registeredMember.display_name.length >= 1 &&
      registeredMember.display_name.length <= 100,
  );
  // Step 8: Validate karma is 0 (default for new members)
  TestValidator.equals("default karma is 0", registeredMember.karma, 0);
  // Step 9: Validate access_token exists and is a non-empty string
  TestValidator.predicate(
    "access_token is present",
    typeof registeredMember.access_token === "string" &&
      registeredMember.access_token.length > 0,
  );
  // Step 10: Validate refresh_token exists and is a non-empty string
  TestValidator.predicate(
    "refresh_token is present",
    typeof registeredMember.refresh_token === "string" &&
      registeredMember.refresh_token.length > 0,
  );
  // Step 11: Validate token structure (access/refresh pairs)
  TestValidator.equals(
    "token property exists",
    registeredMember.token !== undefined,
    true,
  );
  // Step 12: Validate access token expiration (7 days)
  const accessExpireDate = new Date(registeredMember.token.expired_at);
  const now = new Date();
  const oneWeek = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  const timeUntilExpiry = accessExpireDate.getTime() - now.getTime();
  TestValidator.predicate(
    "access_token expires within 7 days",
    timeUntilExpiry >= oneWeek * 0.9 && timeUntilExpiry <= oneWeek * 1.1,
  );
  // Step 13: Validate refresh token expiration (7 days)
  const refreshExpireDate = new Date(registeredMember.token.refreshable_until);
  const refreshTimeUntilExpiry = refreshExpireDate.getTime() - now.getTime();
  TestValidator.predicate(
    "refresh_token expires within 7 days",
    refreshTimeUntilExpiry >= oneWeek * 0.9 &&
      refreshTimeUntilExpiry <= oneWeek * 1.1,
  );
  // Step 14: Validate access_token JWT contains member_id claim
  // JWT format: header.payload.signature, payload is base64 URL encoded
  // Decode payload to verify member_id claim is present
  const parts = registeredMember.access_token.split(".");
  if (parts.length !== 3) {
    throw new Error("Access token is not a valid JWT");
  }
  // Decode base64 URL encoded payload
  const payloadBase64 = parts[1];
  const payloadJson = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
  const payload = JSON.parse(payloadJson);
  TestValidator.equals(
    "access_token contains member_id claim",
    payload.member_id,
    registeredMember.member_id,
  );
  // Step 15: Test failure case - duplicate email registration
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      const duplicateMemberConnection: api.IConnection = {
        host: connection.host,
      };
      await authorize_member_join(duplicateMemberConnection, {
        body: {
          email, // Same email as above - should fail
          password: RandomGenerator.alphaNumeric(16),
        } satisfies ICommunityPlatformMember.IJoin,
      });
    },
  );
  // Step 16: Test failure case - password too short
  await TestValidator.error("password too short should fail", async () => {
    const shortPasswordConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(shortPasswordConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "short", // less than 8 chars - should fail
      } satisfies ICommunityPlatformMember.IJoin,
    });
  });
}
