import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that requesting a platform setting detail with a non-existent ID
 * results in an HTTP error (not-found style) and does not leak internal
 * implementation details, while requiring a valid platform admin session.
 *
 * Business context:
 *
 * - Only platform administrators are allowed to inspect platform-wide
 *   configuration settings.
 * - When an administrator references a stale or mistyped configuration ID, the
 *   system must clearly reject the request instead of returning a successful
 *   settings record.
 * - Error responses must remain operator-meaningful without exposing internal
 *   table names or SQL details.
 *
 * Steps:
 *
 * 1. Register a new platform administrator via auth.platformAdmin.join to obtain
 *    an authenticated admin connection with Authorization header set.
 * 2. Generate a UUID that is extremely unlikely to exist as a
 *    community_platform_platform_settings.id.
 * 3. Call the platform settings detail endpoint using that random UUID.
 * 4. Assert that the call fails with some HttpError (via TestValidator.error),
 *    guaranteeing it cannot be misinterpreted as a successful
 *    ICommunityPlatformPlatformSetting response.
 * 5. Additionally, verify in a follow-up assertion that the error object is an
 *    HttpError-like instance and that its serialized message does not contain
 *    obvious internal leakage markers like the table name.
 */
export async function test_api_platform_settings_detail_nonexistent_id_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator and establish authenticated context.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // Ensure token structure is valid (type-checked only, typia already guarantees).
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Generate a clearly non-existent platformSettingId.
  const nonexistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3~4. Invoke detail endpoint with the non-existent ID and assert that it fails.
  await TestValidator.error(
    "nonexistent platformSettingId must cause HTTP error",
    async () => {
      await api.functional.communityPlatform.platformAdmin.platformSettings.at(
        connection,
        {
          platformSettingId: nonexistentId,
        },
      );
    },
  );

  // 5. Additionally confirm that the thrown error is HttpError-like and that its
  // serialized message does not obviously leak internal table names. We
  // re-execute the call here, catching the error directly for content checks.
  let caught: unknown = null;
  try {
    await api.functional.communityPlatform.platformAdmin.platformSettings.at(
      connection,
      {
        platformSettingId: nonexistentId,
      },
    );
  } catch (exp) {
    caught = exp;
  }

  await TestValidator.predicate(
    "error object must be defined after calling detail with nonexistent id",
    async () => caught !== null && caught !== undefined,
  );

  if (caught && typeof (caught as any).toJSON === "function") {
    const json = (caught as any).toJSON();

    await TestValidator.predicate(
      "error JSON must have a non-empty string message field",
      async () =>
        json !== null &&
        typeof json === "object" &&
        typeof (json as any).message === "string" &&
        (json as any).message.length > 0,
    );

    const message: string = (json as any).message as string;

    await TestValidator.predicate(
      "error message must not contain obvious table name leakage",
      async () =>
        message
          .toLowerCase()
          .includes("community_platform_platform_settings") === false,
    );
  }
}
