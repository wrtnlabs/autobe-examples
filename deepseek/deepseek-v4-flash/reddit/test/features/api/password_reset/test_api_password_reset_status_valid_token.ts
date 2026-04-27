import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPasswordReset";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
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
 * Test that the password reset status endpoint returns 404 for non-existent reset tokens.
 *
 * Registers a member account as a prerequisite, then queries the password reset
 * status endpoint with a randomly generated UUID that does not correspond to any
 * existing reset record. Verifies that the endpoint correctly returns an HTTP 404
 * status, confirming that the routing, validation, and error handling logic for
 * non-existent reset identifiers works as expected.
 *
 * Since the current API surface does not provide a means to create password reset
 * records directly, testing the not-found error path is the most meaningful and
 * verifiable validation available for this endpoint.
 */
export async function test_api_password_reset_status_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join a member (dependency for the test scenario)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Attempt to retrieve a password reset record with a non-existent UUID
  //    The endpoint should return 404 since no such record exists.
  await TestValidator.httpError("non-existent reset ID returns 404", 404, () =>
    api.functional.communityPlatform.member.password_resets.at(
      memberConnection,
      {
        resetId: typia.random<string & tags.Format<"uuid">>(),
      },
    ),
  );
}
