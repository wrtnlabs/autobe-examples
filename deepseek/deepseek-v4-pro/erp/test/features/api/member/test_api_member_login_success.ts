import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member login after registration.
 *
 * Validates the primary login success path where a freshly registered member authenticates successfully. The test first registers a new member account via the join endpoint with randomized credentials, then logs in using the same email and password through the login endpoint on a separate connection.
 *
 * The login response is validated for correct business values: the access and refresh tokens are non-empty, the member's email and display_name match the registration input, avatar_image and phone_number are null for a newly registered member, and the organizations array is empty since the member has no employee records yet.
 *
 * 1. Register a new member with randomized email, password, and display name.
 * 2. Log in with the same credentials on a fresh, separate connection.
 * 3. Validate token non-emptiness, profile field matching, null optional fields, and empty organizations.
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email,
      password,
      display_name: displayName,
    },
  });
  typia.assert(joinResponse);
  // 2. Login with the same credentials on a fresh connection
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmMember.ILogin,
  });
  typia.assert(loginResponse);
  // 3. Validate token pair is non-empty
  TestValidator.predicate(
    "access token is non-empty",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    loginResponse.token.refresh.length > 0,
  );
  // 4. Validate member profile matches registration input
  TestValidator.equals(
    "email matches registration",
    loginResponse.email,
    email,
  );
  TestValidator.equals(
    "display_name matches registration",
    loginResponse.display_name,
    displayName,
  );
  // 5. Validate null optional fields for new member
  TestValidator.equals(
    "avatar_image is null for new member",
    loginResponse.avatar_image,
    null,
  );
  TestValidator.equals(
    "phone_number is null for new member",
    loginResponse.phone_number,
    null,
  );
  // 6. Validate organizations is empty for member with no employee records
  TestValidator.equals(
    "organizations is empty for new member",
    loginResponse.organizations.length,
    0,
  );
}
