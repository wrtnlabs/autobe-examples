import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account using utility function
  const joinConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallMember.IJoin;
  const joinedUser = await api.functional.ecommerceMall.auth.member.join(
    joinConnection,
    { body: joinBody },
  );
  typia.assert(joinedUser);
  // Step 2: Login with the registered credentials using utility function
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: joinBody.ip,
  } satisfies IEcommerceMallMember.ILogin;
  const loggedUser = await api.functional.ecommerceMall.auth.member.login(
    loginConnection,
    { body: loginBody },
  );
  typia.assert(loggedUser);
  // Step 3: Verify all required fields in IAuthorized response
  TestValidator.equals("user id matches", joinedUser.id, loggedUser.id);
  TestValidator.equals("email matches", joinedUser.email, loggedUser.email);
  TestValidator.equals(
    "display name matches",
    joinedUser.display_name,
    loggedUser.display_name,
  );
  TestValidator.equals(
    "phone number matches",
    joinedUser.phone_number,
    loggedUser.phone_number,
  );
  TestValidator.equals(
    "created at matches",
    joinedUser.created_at,
    loggedUser.created_at,
  );
  TestValidator.equals(
    "updated at matches",
    joinedUser.updated_at,
    loggedUser.updated_at,
  );
  // Step 4: Verify access token is non-empty JWT string
  TestValidator.predicate(
    "access token is not empty",
    loggedUser.access.length > 0,
  );
  // Step 5: Verify refresh token is non-empty JWT string
  TestValidator.predicate(
    "refresh token is not empty",
    loggedUser.refresh.length > 0,
  );
  // Step 6: Verify expired_at is within reasonable time range (current time + 1 hour)
  const now = new Date();
  const expiredDate = new Date(loggedUser.expired_at);
  const expectedMaxTime = now.getTime() + 60 * 60 * 1000; // 1 hour
  const expectedMinTime = now.getTime() + 50 * 60 * 1000; // 50 minutes (allow 10 min variance)
  TestValidator.predicate(
    "expired_at is within 1 hour",
    expiredDate.getTime() >= expectedMinTime &&
      expiredDate.getTime() <= expectedMaxTime,
  );
  // Step 7: Verify token.refreshable_until is set appropriately
  TestValidator.predicate(
    "refreshable_until is set",
    loggedUser.token.refreshable_until !== undefined &&
      loggedUser.token.refreshable_until.length > 0,
  );
  const refreshableUntil = new Date(loggedUser.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil.getTime() > now.getTime(),
  );
}
