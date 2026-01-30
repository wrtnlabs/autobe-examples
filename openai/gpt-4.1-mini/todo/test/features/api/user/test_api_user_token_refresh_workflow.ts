import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_user_token_refresh_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and register a new member user
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse: ITodoAppUser.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      // Use random but valid user join data
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: RandomGenerator.alphaNumeric(16),
        href: `https://example.com/register`,
        referrer: `https://example.com/home`,
      },
    },
  );
  // Validate the join response
  typia.assert(joinResponse);
  // Extract initial tokens and refresh token
  const originalAccessToken = joinResponse.token.access;
  const originalRefreshToken = joinResponse.token.refresh;
  // Step 2: Use the refresh token to obtain new tokens
  const refreshResponse: ITodoAppUser.IAuthorized =
    await authorize_member_refresh(memberConnection, {
      body: { refresh_token: originalRefreshToken },
    });
  // Validate the refresh response
  typia.assert(refreshResponse);
  // Validate that the new tokens are different from the original tokens
  TestValidator.predicate(
    "access token is renewed",
    refreshResponse.token.access !== originalAccessToken,
  );
  TestValidator.predicate(
    "refresh token is renewed",
    refreshResponse.token.refresh !== originalRefreshToken,
  );
  // Validate expired_at and refreshable_until are valid ISO date strings
  TestValidator.predicate(
    "expired_at is valid ISO string",
    typeof refreshResponse.token.expired_at === "string" &&
      !isNaN(Date.parse(refreshResponse.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO string",
    typeof refreshResponse.token.refreshable_until === "string" &&
      !isNaN(Date.parse(refreshResponse.token.refreshable_until)),
  );
}
