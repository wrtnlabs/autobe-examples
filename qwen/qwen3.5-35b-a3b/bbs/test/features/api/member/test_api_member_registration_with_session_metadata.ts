import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_with_session_metadata(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection for join operation
  const memberConnection: api.IConnection = { host: connection.host };
  // Prepare registration data with required session fields
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEconomicPoliticalBoardMember.IJoin;
  // Execute member join with session metadata
  const output = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  // Validate response structure
  typia.assert(output);
  typia.assert(output.token);
  // Verify member id is valid UUID format
  TestValidator.predicate(
    "member id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      output.id,
    ),
  );
  // Verify token expiration order (access expires before refresh deadline)
  const expiredAt = Date.parse(output.token.expired_at);
  const refreshableUntil = Date.parse(output.token.refreshable_until);
  const now = new Date().getTime();
  TestValidator.predicate("access token expires in future", expiredAt > now);
  TestValidator.predicate(
    "refreshable until in future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "access expires before refresh deadline",
    expiredAt < refreshableUntil,
  );
  // Test registration with missing optional ip (should succeed)
  const memberConnection2: api.IConnection = { host: connection.host };
  const joinInputWithoutIp = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconomicPoliticalBoardMember.IJoin;
  const outputWithoutIp = await authorize_member_join(memberConnection2, {
    body: joinInputWithoutIp,
  });
  typia.assert(outputWithoutIp);
  // Verify both registrations returned valid tokens
  TestValidator.predicate(
    "registration without ip succeeded",
    outputWithoutIp.id !== undefined,
  );
  TestValidator.predicate(
    "token without ip exists",
    outputWithoutIp.token.access !== "",
  );
}
