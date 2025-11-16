import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityEvent";
import type { IShoppingMallSecurityEventMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityEventMetadata";
import type { IShoppingMallSecurityEventMetadataValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityEventMetadataValue";

export async function test_api_security_event_get_by_id_success(
  connection: api.IConnection,
) {
  // 1. Join as a platform administrator to obtain an authenticated session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Prepare a random securityEventId (UUID) to request
  const securityEventId = typia.random<string & tags.Format<"uuid">>();

  // 3. Call the security events GET endpoint as the authenticated platform admin
  const event =
    await api.functional.shoppingMall.platformAdmin.securityEvents.at(
      connection,
      {
        securityEventId,
      },
    );
  typia.assert<IShoppingMallSecurityEvent>(event);

  // 4. Validate key business fields
  TestValidator.equals(
    "security event id should match requested id",
    event.id,
    securityEventId,
  );

  TestValidator.predicate(
    "security event_type should be non-empty",
    event.event_type.length > 0,
  );

  TestValidator.predicate(
    "security severity should be non-empty",
    event.severity.length > 0,
  );

  TestValidator.predicate(
    "security event occurred_at should be non-empty",
    event.occurred_at.length > 0,
  );

  TestValidator.predicate(
    "security event recorded_at should be non-empty",
    event.recorded_at.length > 0,
  );
}
