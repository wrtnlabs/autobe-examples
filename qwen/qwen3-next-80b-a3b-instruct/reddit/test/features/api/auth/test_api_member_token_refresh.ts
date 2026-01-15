import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_token_refresh(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate member via join to obtain a refresh token
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(memberAuth);
  // Step 2: Extract the refresh token from the authentication response
  const refresh_token = memberAuth.token.refresh;
  const expires_at = memberAuth.token.refreshable_until;
  // Step 3: Create a new connection for the refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  // Step 4: Perform the token refresh operation using the valid refresh token
  const refreshed: ICommunityPlatformMember.IAuthorized =
    await authorize_member_refresh(refreshConnection, {
      body: {
        token: refresh_token,
        expires_at,
      } satisfies ICommunityPlatformMember.IRefresh,
    });
  typia.assert(refreshed);
  // Step 5: Validate that member identity is preserved in the response
  TestValidator.equals("member id preserved", refreshed.id, memberAuth.id);
  TestValidator.equals(
    "member email preserved",
    refreshed.email,
    memberAuth.email,
  );
  TestValidator.equals(
    "member createdAt preserved",
    refreshed.createdAt,
    memberAuth.createdAt,
  );
  // Step 6: Validate that the response structure is correct and tokens have expected format
  typia.assert<IAuthorizationToken>(refreshed.token);
  // Step 7: Validate that all date-time string formats are correct according to the schema
  // Typia.assert already validates the date-time format, so no additional validation needed
  // The time values are validated as string & Format<'date-time'> by typia.assert
}
