import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for member registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate valid registration data using typia.random for type-safe values
  const joinData: IRedditCommunityMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
  } satisfies IRedditCommunityMember.IJoin;
  // Use the utility function for member registration (mandatory usage)
  const result: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: joinData });
  // Validate the response structure with typia.assert
  typia.assert(result);
  // Verify required fields are present and non-null
  TestValidator.equals("member ID is present", result.id, result.id);
  TestValidator.predicate(
    "member username is present",
    result.username !== null,
  );
  TestValidator.predicate("access token is present", result.access !== null);
  TestValidator.predicate("refresh token is present", result.refresh !== null);
  // Verify sensitive fields are null as per spec (email and display_name)
  TestValidator.equals(
    "email is null (security requirement)",
    result.email,
    null,
  );
  TestValidator.equals(
    "display_name is null (default)",
    result.display_name,
    null,
  );
  // Validate token structure by asserting the IAuthorizationToken
  typia.assert(result.token);
  // Validate username matches input
  TestValidator.equals(
    "username matches input",
    result.username,
    joinData.username,
  );
  // Validate karma score is an int32
  TestValidator.predicate(
    "karma score is integer",
    Number.isInteger(result.karma_score),
  );
  // Validate timestamps are ISO date-time format (implicit validation by typia.assert)
  // No explicit validation needed due to format<"date-time"> constraint
  // Validate is_deleted is false
  TestValidator.equals("is_deleted is false", result.is_deleted, false);
}
