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
export async function test_api_member_login(connection: api.IConnection) {
  // Generate random email for the member
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  // Create a new member account with the generated email
  const member: IDiscussionBoardMember.IAuthorized =
    await authorize_member_join(connection, {
      body: {
        href: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
        referrer: `https://referrer.com/${RandomGenerator.alphaNumeric(8)}`,
        ip: null,
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);
  // Login with the newly created account using the email from join
  const loginResult: IDiscussionBoardMember.IAuthorized =
    await authorize_member_login(connection, {
      body: {
        email: email,
        password: "password123",
        href: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
        referrer: `https://referrer.com/${RandomGenerator.alphaNumeric(8)}`,
        ip: null,
      } satisfies IDiscussionBoardMember.ILogin,
    });
  typia.assert(loginResult);
  // Verify tokens are present
  TestValidator.equals(
    "access token present",
    "string",
    typeof loginResult.token.access,
  );
  TestValidator.equals(
    "refresh token present",
    "string",
    typeof loginResult.token.refresh,
  );
  TestValidator.equals(
    "token expiration timestamp present",
    "string",
    typeof loginResult.token.expired_at,
  );
  TestValidator.equals(
    "token refreshable until timestamp present",
    "string",
    typeof loginResult.token.refreshable_until,
  );
}
