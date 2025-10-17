import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumSiteSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumSiteSetting";

export async function test_api_site_setting_retrieval_by_admin_success(
  connection: api.IConnection,
) {
  // 1) Administrator registration (join) to obtain authentication token
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    // Use alphaNumeric for username to guarantee min-length and safe characters
    username: RandomGenerator.alphaNumeric(8),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const adminAuth: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // The SDK sets connection.headers.Authorization automatically on successful join

  // 2) Determine siteSettingId to request. Prefer seeded env var for CI reproducibility.
  const envId = process.env.TEST_SITE_SETTING_ID as string | undefined;
  const siteSettingId: string =
    envId ?? typia.random<string & tags.Format<"uuid">>();

  // 3) Retrieve site setting by id as authenticated admin
  const siteSetting: IEconPoliticalForumSiteSetting =
    await api.functional.econPoliticalForum.administrator.siteSettings.at(
      connection,
      {
        siteSettingId,
      },
    );

  // 4) Validate response type
  typia.assert(siteSetting);

  // Business-level checks (do not duplicate typia.assert's type checks)
  if (envId) {
    // When a deterministic seeded id is provided, assert exact match
    TestValidator.equals(
      "returned site setting id matches requested seeded id",
      siteSetting.id,
      siteSettingId,
    );
  } else {
    // In simulation or when no seeded id provided, ensure returned id is a UUID
    TestValidator.predicate(
      "returned site setting id looks like UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        siteSetting.id,
      ),
    );
  }

  TestValidator.predicate(
    "site setting key is present",
    siteSetting.key.length > 0,
  );

  // Admin consumers should see the raw value (application-level check)
  TestValidator.predicate(
    "site setting value is present for admin",
    siteSetting.value !== undefined && siteSetting.value !== null,
  );

  // Created and updated timestamps should be present (typia.assert already validated formats)
  TestValidator.predicate(
    "created_at is present",
    typeof siteSetting.created_at === "string" &&
      siteSetting.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is present",
    typeof siteSetting.updated_at === "string" &&
      siteSetting.updated_at.length > 0,
  );

  // Note: Audit-log verification (econ_political_forum_audit_logs) cannot be performed
  // via the provided SDK functions. To verify an audit entry was created for this access,
  // the test harness should either query the test DB directly or call a dedicated audit API
  // (not available in this SDK). Implementers must add DB-level verification if required by CI.
}
