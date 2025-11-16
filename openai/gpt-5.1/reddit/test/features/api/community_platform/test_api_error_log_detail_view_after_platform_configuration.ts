import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLog";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate platform admin error log detail retrieval after platform
 * configuration exists.
 *
 * Business objectives:
 *
 * - Ensure that a freshly registered platform administrator, after creating at
 *   least one platform-wide configuration setting, can retrieve full details
 *   for a specific error log via the platformAdmin error log detail endpoint.
 * - Confirm that the response structure matches ICommunityPlatformErrorLog and
 *   that repeated reads return a stable, unchanged record (read-only
 *   behavior).
 *
 * Test flow:
 *
 * 1. Join as a new platform administrator using POST /auth/platformAdmin/join.
 * 2. As this authenticated admin, create a platform-wide configuration setting via
 *    POST /communityPlatform/platformAdmin/platformSettings.
 * 3. Obtain a realistic errorLogId representing an existing error log entry.
 * 4. Call GET /communityPlatform/platformAdmin/errorLogs/{errorLogId} and validate
 *    the returned payload.
 * 5. Call the same endpoint again for the same errorLogId to verify immutability
 *    of the error log record across reads.
 */
export async function test_api_error_log_detail_view_after_platform_configuration(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator (join)
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.community.example.com/register",
    referrer: "https://admin.console.community.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdmin);

  TestValidator.predicate(
    "platform admin id should be a non-empty string",
    platformAdmin.id.length > 0,
  );

  // 2. Create a platform-wide configuration setting as this admin
  const platformSettingBody = {
    key: `logging.retention.${RandomGenerator.alphabets(8)}`,
    value: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const createdSetting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: platformSettingBody,
      },
    );
  typia.assert<ICommunityPlatformPlatformSetting>(createdSetting);

  TestValidator.equals(
    "created platform setting key should match request body",
    createdSetting.key,
    platformSettingBody.key,
  );
  TestValidator.equals(
    "created platform setting value should match request body",
    createdSetting.value,
    platformSettingBody.value,
  );
  TestValidator.equals(
    "created platform setting is_active should match request body",
    createdSetting.is_active,
    platformSettingBody.is_active,
  );

  // 3. Prepare an existing errorLogId
  // In simulation mode, we can obtain a realistic error log sample using the
  // at.random() helper as a stand-in for a persisted error log entry.
  const seededErrorLog: ICommunityPlatformErrorLog =
    api.functional.communityPlatform.platformAdmin.errorLogs.at.random();
  typia.assert<ICommunityPlatformErrorLog>(seededErrorLog);

  const errorLogId: string & tags.Format<"uuid"> = seededErrorLog.id;

  // 4. Retrieve error log details via the detail endpoint
  const firstRead: ICommunityPlatformErrorLog =
    await api.functional.communityPlatform.platformAdmin.errorLogs.at(
      connection,
      {
        errorLogId,
      },
    );
  typia.assert<ICommunityPlatformErrorLog>(firstRead);

  // 5. Validate response semantics
  TestValidator.equals(
    "error log id in response should equal requested errorLogId",
    firstRead.id,
    errorLogId,
  );

  TestValidator.predicate(
    "error log message should be non-empty",
    firstRead.message.length > 0,
  );

  TestValidator.predicate(
    "error log error_severity should be non-empty",
    firstRead.error_severity.length > 0,
  );

  TestValidator.predicate(
    "error log source_component should be non-empty",
    firstRead.source_component.length > 0,
  );

  TestValidator.predicate(
    "error log created_at should be non-empty",
    firstRead.created_at.length > 0,
  );

  // 6. Verify read-only behavior by reading the same error log again
  const secondRead: ICommunityPlatformErrorLog =
    await api.functional.communityPlatform.platformAdmin.errorLogs.at(
      connection,
      {
        errorLogId,
      },
    );
  typia.assert<ICommunityPlatformErrorLog>(secondRead);

  // Compare key fields between first and second reads to confirm immutability
  TestValidator.equals(
    "subsequent read should return same error log id",
    secondRead.id,
    firstRead.id,
  );
  TestValidator.equals(
    "subsequent read should return same message",
    secondRead.message,
    firstRead.message,
  );
  TestValidator.equals(
    "subsequent read should return same error_severity",
    secondRead.error_severity,
    firstRead.error_severity,
  );
  TestValidator.equals(
    "subsequent read should return same source_component",
    secondRead.source_component,
    firstRead.source_component,
  );
  TestValidator.equals(
    "subsequent read should return same created_at",
    secondRead.created_at,
    firstRead.created_at,
  );
}
