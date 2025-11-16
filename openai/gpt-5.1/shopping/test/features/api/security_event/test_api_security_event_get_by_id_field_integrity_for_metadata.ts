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

export async function test_api_security_event_get_by_id_field_integrity_for_metadata(
  connection: api.IConnection,
) {
  // 1. Join as a platform administrator to obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Retrieve a security event by random UUID
  const securityEventId = typia.random<string & tags.Format<"uuid">>();

  const event =
    await api.functional.shoppingMall.platformAdmin.securityEvents.at(
      connection,
      {
        securityEventId,
      },
    );
  typia.assert<IShoppingMallSecurityEvent>(event);

  // 3. Basic sanity checks on core fields
  TestValidator.predicate(
    "security event id is a non-empty string",
    () => typeof event.id === "string" && event.id.length > 0,
  );
  TestValidator.predicate(
    "occurred_at is non-empty string",
    () => typeof event.occurred_at === "string" && event.occurred_at.length > 0,
  );
  TestValidator.predicate(
    "recorded_at is non-empty string",
    () => typeof event.recorded_at === "string" && event.recorded_at.length > 0,
  );

  // 4. Validate metadata integrity when present
  if (event.metadata === undefined) {
    // When metadata is absent, just assert it is truly undefined
    TestValidator.predicate(
      "metadata is undefined when not provided",
      () => event.metadata === undefined,
    );
    return;
  }

  // 4-1. Assert metadata structure matches IShoppingMallSecurityEventMetadata
  const metadata = event.metadata;
  typia.assert<IShoppingMallSecurityEventMetadata>(metadata);

  // There should be at least one key when metadata object exists
  const keys = Object.keys(metadata);
  TestValidator.predicate(
    "metadata object has at least one key when defined",
    () => keys.length > 0,
  );

  // 4-2. Validate each metadata entry value type
  for (const key of keys) {
    const value = metadata[key];
    // Each value must satisfy IShoppingMallSecurityEventMetadataValue
    typia.assert<IShoppingMallSecurityEventMetadataValue>(value);
  }

  // 4-3. Ensure deep structure is preserved via JSON round-trip
  const roundTripped = JSON.parse(JSON.stringify(metadata)) as unknown;
  typia.assert<IShoppingMallSecurityEventMetadata>(roundTripped);

  TestValidator.equals<IShoppingMallSecurityEventMetadata>(
    "metadata remains structurally identical after JSON round-trip",
    metadata,
    roundTripped as IShoppingMallSecurityEventMetadata,
  );

  // 4-4. For a sample of metadata keys, perform more granular checks on arrays
  const sampleKeys = keys.slice(0, 3);
  for (const key of sampleKeys) {
    const originalValue = metadata[key];
    const clonedValue = (roundTripped as IShoppingMallSecurityEventMetadata)[
      key
    ];

    // If the value is an array, verify length and basic element type consistency
    if (Array.isArray(originalValue) && Array.isArray(clonedValue)) {
      TestValidator.equals(
        "array metadata value length is preserved",
        originalValue.length,
        clonedValue.length,
      );

      if (originalValue.length > 0) {
        const firstOriginal = originalValue[0];
        const firstCloned = clonedValue[0];
        TestValidator.equals(
          "first element type is preserved in metadata array",
          typeof firstOriginal,
          typeof firstCloned,
        );
      }
    }
  }
}
