import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_login_with_valid_context(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a valid member account using the join endpoint
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const memberJoinInput = {
    email,
    password,
    href,
    referrer,
  } satisfies IDiscussionBoardUser.IJoin;
  const registeredMember = await authorize_member_join(connection, {
    body: memberJoinInput,
  });
  typia.assert(registeredMember);
  // Step 2: Create a new connection and authenticate with complete client context
  const loginConnection: api.IConnection = { host: connection.host };
  const memberLoginInput = {
    email, // Use the original email from memberJoinInput, NOT from registeredMember (which doesn't have email property)
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null, // Optional field, setting to null to test handling of missing IP
  } satisfies IDiscussionBoardUser.ILogin;
  const authenticatedMember = await authorize_member_login(loginConnection, {
    body: memberLoginInput,
  });
  typia.assert(authenticatedMember);
  // Step 3: Validate authentication result
  TestValidator.equals(
    "member ID matches",
    authenticatedMember.id,
    registeredMember.id,
  );
  TestValidator.equals(
    "member email verified",
    authenticatedMember.emailVerified,
    true,
  );
  TestValidator.equals(
    "member display name is set",
    typeof authenticatedMember.displayName,
    "string",
  );
  TestValidator.equals(
    "member created at is set",
    typeof authenticatedMember.createdAt,
    "string",
  );
  TestValidator.predicate(
    "token access exists",
    () => !!authenticatedMember.token.access,
  );
  TestValidator.predicate(
    "token refresh exists",
    () => !!authenticatedMember.token.refresh,
  );
  TestValidator.predicate("access token expired_at is valid date-time", () => {
    return typia.is<string & tags.Format<"date-time">>(
      authenticatedMember.token.expired_at,
    );
  });
  TestValidator.predicate(
    "refresh token refreshable_until is valid date-time",
    () => {
      return typia.is<string & tags.Format<"date-time">>(
        authenticatedMember.token.refreshable_until,
      );
    },
  );
}
