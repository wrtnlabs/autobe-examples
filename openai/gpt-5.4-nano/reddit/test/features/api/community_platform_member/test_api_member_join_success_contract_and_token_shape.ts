import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_success_contract_and_token_shape(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 2. Perform join via utility (must not call api.functional.* for this endpoint)
  const inputEmail = typia.random<string & tags.Format<"email">>();
  const inputPassword = typia.random<string & tags.Format<"password">>();
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: inputEmail,
      password: inputPassword,
    },
  });
  typia.assert(authorized);
  // 3. Contract assertions: id
  TestValidator.predicate(
    "member id should be non-empty uuid",
    authorized.id.trim().length > 0,
  );
  // 4. Contract assertions: token shape + expiration ordering
  const token = authorized.token;
  typia.assert(token);
  TestValidator.predicate(
    "access token should be non-empty",
    token.access.trim().length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty",
    token.refresh.trim().length > 0,
  );
  // Validate refreshable_until is not earlier than expired_at
  // (expired_at/refreshable_until are already validated as date-time by typia.assert)
  const expiredTime = new Date(token.expired_at).getTime();
  const refreshableTime = new Date(token.refreshable_until).getTime();
  TestValidator.predicate(
    "refreshable_until should not be earlier than expired_at",
    refreshableTime >= expiredTime,
  );
  // 5. Ensure no credential material is returned
  TestValidator.predicate(
    "no password field in response",
    !Object.prototype.hasOwnProperty.call(authorized, "password"),
  );
  TestValidator.predicate(
    "no password_hash field in response",
    !Object.prototype.hasOwnProperty.call(authorized, "password_hash"),
  );
}
