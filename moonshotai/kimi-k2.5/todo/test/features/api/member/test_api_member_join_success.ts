import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member join success scenario.
 * Guest provides unique email and password to register a new member account.
 * System creates member record with UUID v7 id, hashes password, and establishes
 * session with access_token (15 min expiry) and refresh_token (7 day expiry).
 * Response includes complete member identity and authorization tokens.
 */
export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection for actor isolation
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate valid member registration credentials
  const joinBody = {
    email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"url">>(),
    referrer: typia.random<string & tags.Format<"url">>(),
  } satisfies IMultiUserTodoMember.IJoin;
  // Call join utility which creates member and updates connection headers with auth token
  const authorized = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  // Validate complete response structure including member identity and authorization token
  typia.assert<IMultiUserTodoMember.IAuthorized>(authorized);
}
