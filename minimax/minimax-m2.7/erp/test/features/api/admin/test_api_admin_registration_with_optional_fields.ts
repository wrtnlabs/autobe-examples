import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_registration_with_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for registration
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate random data for required and optional fields
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  const avatarUri = typia.random<string & tags.Format<"uri">>();
  const phone = RandomGenerator.mobile();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // Register admin with optional fields (avatar_uri, phone)
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email,
      password,
      display_name: displayName,
      avatar_uri: avatarUri,
      phone,
      href,
      referrer,
    },
  });
  // Validate complete response structure
  typia.assert(authorized);
  // Validate optional fields are correctly stored and returned
  TestValidator.equals(
    "avatar_uri matches input",
    authorized.avatar_uri,
    avatarUri,
  );
  TestValidator.equals("phone matches input", authorized.phone, phone);
  // Validate required fields
  TestValidator.equals("email matches input", authorized.email, email);
  TestValidator.equals(
    "display_name matches input",
    authorized.display_name,
    displayName,
  );
  // Validate JWT tokens are generated correctly
  TestValidator.predicate(
    "access token is non-empty string",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorized.token.expired_at),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      authorized.token.refreshable_until,
    ),
  );
}
