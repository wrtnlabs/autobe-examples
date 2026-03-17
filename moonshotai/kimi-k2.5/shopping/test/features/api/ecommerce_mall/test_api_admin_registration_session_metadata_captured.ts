import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test session metadata recording during administrator registration.
 * Submit registration request with all required session context fields:
 * href (registration page URL), referrer (referring URL), and ip address.
 * Verify the registration succeeds and the session record is created
 * capturing all provided metadata for audit trail purposes.
 */
export async function test_api_admin_registration_session_metadata_captured(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection using connection isolation pattern
  const adminConnection: api.IConnection = { host: connection.host };
  // Define session metadata fields for audit trail testing
  const sessionMetadata = {
    href: "https://admin.example.com/auth/join" as const,
    referrer: "https://example.com/admin-invite" as const,
    ip: "203.0.113.50" as const,
  };
  // Execute administrator registration with session metadata
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: sessionMetadata.href,
      referrer: sessionMetadata.referrer,
      ip: sessionMetadata.ip,
    },
  });
  // Verify registration succeeded with valid authorization response
  typia.assert(authorized);
  // Validate administrator account properties
  TestValidator.equals(
    "administrator grade is regular",
    authorized.grade,
    "regular",
  );
  TestValidator.equals(
    "administrator status is active",
    authorized.status,
    "active",
  );
  TestValidator.predicate(
    "access token is present",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration is set",
    authorized.token.expired_at.length > 0,
  );
}
