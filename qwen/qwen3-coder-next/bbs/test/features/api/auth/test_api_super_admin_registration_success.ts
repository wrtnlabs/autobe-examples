import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate valid registration data
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SuperSecurePass123!",
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardSuperAdmin.IJoin;
  // Call the registration endpoint
  const result = await api.functional.discussionBoard.auth.superAdmin.join(
    connection,
    {
      body: registrationData,
    },
  );
  // Validate response structure
  typia.assert<IDiscussionBoardSuperAdmin.IAuthorized>(result);
  // Verify key fields
  TestValidator.equals("email matches", result.email, registrationData.email);
  TestValidator.predicate(
    "has valid UUID id",
    /^[0-9a-f-]{36}$/i.test(result.id),
  );
  TestValidator.equals(
    "authorizationActor is superAdmin",
    result.authorizationActor,
    "superAdmin",
  );
  TestValidator.equals(
    "display_name matches input or null",
    result.display_name === null ||
      result.display_name === registrationData.display_name,
    true,
  );
  // Validate token structure
  typia.assert<IAuthorizationToken>(result.token);
  TestValidator.equals(
    "access token exists",
    typeof result.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token exists",
    typeof result.token.refresh,
    "string",
  );
  // Validate expiration timestamps are valid ISO datetime strings
  TestValidator.predicate(
    "expired_at is valid date",
    new Date(result.token.expired_at).toISOString() === result.token.expired_at,
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    new Date(result.token.refreshable_until).toISOString() ===
      result.token.refreshable_until,
  );
}
