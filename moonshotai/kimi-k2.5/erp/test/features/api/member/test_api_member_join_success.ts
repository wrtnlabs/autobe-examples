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

export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for member registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate valid registration data with all required fields
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    firstName: RandomGenerator.name(1),
    lastName: RandomGenerator.name(1),
    avatarUrl: null,
    timezone: null,
    locale: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IErpHrmMember.IJoin;
  // Execute registration using utility function (priority over SDK)
  const authorized = await authorize_member_join(memberConnection, { body });
  typia.assert(authorized);
  // Validate business logic: response data matches input
  TestValidator.equals("email matches input", authorized.email, body.email);
  TestValidator.equals(
    "firstName matches input",
    authorized.firstName,
    body.firstName,
  );
  TestValidator.equals(
    "lastName matches input",
    authorized.lastName,
    body.lastName,
  );
  // Validate business logic: new account status
  TestValidator.equals(
    "email not verified initially",
    authorized.emailVerifiedAt,
    null,
  );
  TestValidator.equals("account is active", authorized.deletedAt, null);
  // Validate business logic: authentication tokens present
  TestValidator.predicate(
    "access token exists",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has expiration",
    authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token has refreshable_until",
    authorized.token.refreshable_until.length > 0,
  );
}
