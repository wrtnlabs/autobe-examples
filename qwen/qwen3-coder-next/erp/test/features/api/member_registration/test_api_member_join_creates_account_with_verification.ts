import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_creates_account_with_verification(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for member registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Prepare member registration data
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHrmTrackerMember.IJoin;
  // Call join endpoint
  const result = await api.functional.hrmTracker.auth.member.join(
    memberConnection,
    { body },
  );
  typia.assert(result);
  // Validate member status and email verification state
  TestValidator.equals("status should be active", result.status, "active");
  TestValidator.equals(
    "email_verified should be false",
    result.email_verified,
    false,
  );
  // Validate token structure
  typia.assert<IAuthorizationToken>(result.token);
  TestValidator.predicate(
    "access token present",
    result.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present",
    result.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expires in future",
    new Date(result.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token valid until in future",
    new Date(result.token.refreshable_until) > new Date(),
  );
  // Validate member properties
  TestValidator.equals(
    "display name matches",
    result.display_name,
    body.display_name,
  );
  TestValidator.equals("email matches", result.email, body.email);
}