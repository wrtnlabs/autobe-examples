import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_token_refresh_successful(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member account
  const memberAccount = await authorize_member_join(connection, {
    body: {
      href: `https://example.com/${RandomGenerator.alphaNumeric(10)}`,
      referrer: `https://example.com/${RandomGenerator.alphaNumeric(10)}`,
      ip: `192.168.0.${RandomGenerator.alphaNumeric(3)}`,
    },
  });
  typia.assert(memberAccount);
  // Step 2: Refresh the token using the refresh token from the response
  const refreshedToken = await authorize_member_refresh(connection, {
    body: {
      refreshToken: memberAccount.token.refresh,
      href: `https://example.com/${RandomGenerator.alphaNumeric(10)}`,
      referrer: `https://example.com/${RandomGenerator.alphaNumeric(10)}`,
      ip: `192.168.0.${RandomGenerator.alphaNumeric(3)}`,
    },
  });
  typia.assert(refreshedToken);
  // Step 3: Verify that the refresh token was renewed (it should be different)
  TestValidator.notEquals(
    "refresh token was renewed",
    memberAccount.token.refresh,
    refreshedToken.token.refresh,
  );
}
