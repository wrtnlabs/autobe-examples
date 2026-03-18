import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_basic_registration(
  connection: api.IConnection,
): Promise<void> {
  // Prepare unique registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Create a dedicated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Call the utility function for POST /erpHrm/auth/member/join
  const result = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip,
    } satisfies IErpHrmMember.IJoin,
  });
  // Validate full response structure
  typia.assert(result);
  // Business logic assertions
  TestValidator.equals(
    "registered email matches input",
    result.member.email,
    email,
  );
  TestValidator.equals(
    "account is active (deleted_at is null)",
    result.member.deleted_at,
    null,
  );
  TestValidator.predicate(
    "access token is non-empty",
    result.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    result.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "access and refresh tokens are distinct",
    result.token.access,
    result.token.refresh,
  );
  TestValidator.predicate(
    "member id is non-empty",
    result.member.id.length > 0,
  );
}
