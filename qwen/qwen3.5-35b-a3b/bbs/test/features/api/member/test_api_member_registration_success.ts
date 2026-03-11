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

export async function test_api_member_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare unique registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const name = RandomGenerator.name();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const joinBody = {
    email,
    password,
    name,
    href,
    referrer,
    ip,
  } satisfies IEconomicPoliticalBoardMember.IJoin;
  // 2. Create member-specific connection for registration
  const memberConnection: api.IConnection = { host: connection.host };
  // 3. Execute member registration
  const output = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  // 4. Validate registration response structure
  typia.assert(output);
  // 5. Verify response contains required fields with proper types
  typia.assert(output.id);
  typia.assert(output.token);
  typia.assert(output.token.access);
  typia.assert(output.token.refresh);
  typia.assert(output.token.expired_at);
  typia.assert(output.token.refreshable_until);
  // 6. Validate token expiration timestamps are in valid date-time format
  const expiredAtDate = new Date(output.token.expired_at);
  const refreshableDate = new Date(output.token.refreshable_until);
  TestValidator.predicate(
    "expired_at is valid date",
    !isNaN(expiredAtDate.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    !isNaN(refreshableDate.getTime()),
  );
  // 7. Verify access token expires before refreshable_until (access is shorter-lived)
  TestValidator.predicate(
    "access expires before refresh deadline",
    expiredAtDate.getTime() < refreshableDate.getTime(),
  );
  // 8. Test duplicate email registration (should fail at database level)
  await TestValidator.error("duplicate email should fail", async () => {
    const duplicateJoinBody = {
      email,
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomicPoliticalBoardMember.IJoin;
    await authorize_member_join(memberConnection, {
      body: duplicateJoinBody,
    });
  });
}
