import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumSiteSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumSiteSetting";

/*
 * E2E test: Administrator updates site settings (partial patch) and validation
 *
 * This test performs the following steps:
 * 1. Registers a fresh administrator via POST /auth/administrator/join to obtain
 *    authorization tokens (IAuthorized). The SDK will store the access token
 *    into the provided connection automatically.
 * 2. Sends a PATCH /econPoliticalForum/administrator/siteSettings request with a
 *    well-typed IEconPoliticalForumSiteSetting.IUpdate body to change the
 *    value/description/is_public fields of a site setting. The test expects
 *    the server to return the updated IEconPoliticalForumSiteSetting record.
 * 3. Validates that returned fields match the requested updates and that
 *    timestamps progressed (updated_at >= created_at).
 * 4. Negative test: attempts the same PATCH using an unauthenticated connection
 *    (created by cloning the connection with empty headers) and expects an
 *    authorization error captured via TestValidator.error.
 */
export async function test_api_site_settings_patch_by_administrator(
  connection: api.IConnection,
) {
  // 1) Administrator registration (creates admin and stores token on connection)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminAuth: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "Str0ngP@ssword!",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(adminAuth);

  // Verify that token exists
  TestValidator.predicate(
    "administrator join returns access token",
    typeof adminAuth.token?.access === "string" &&
      adminAuth.token.access.length > 0,
  );

  // 2) Prepare a valid update body
  const newValue: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const updateBody = {
    value: newValue,
    description: "E2E test update: set new value and expose publicly",
    is_public: true,
  } satisfies IEconPoliticalForumSiteSetting.IUpdate;

  // 3) Execute PATCH to update site setting
  const updated: IEconPoliticalForumSiteSetting =
    await api.functional.econPoliticalForum.administrator.siteSettings.patch(
      connection,
      {
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4) Business-level validations
  TestValidator.equals(
    "updated.value matches request",
    updated.value,
    updateBody.value,
  );
  TestValidator.equals(
    "updated.description matches request",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "updated.is_public matches request",
    updated.is_public,
    updateBody.is_public,
  );

  // Timestamp progression: updated_at should exist and not be earlier than created_at
  TestValidator.predicate(
    "updated_at is present and not earlier than created_at",
    typeof updated.updated_at === "string" &&
      typeof updated.created_at === "string" &&
      updated.updated_at >= updated.created_at,
  );

  // 5) Negative test - permission enforcement: unauthenticated patch should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated caller cannot patch site settings",
    async () => {
      await api.functional.econPoliticalForum.administrator.siteSettings.patch(
        unauthConn,
        {
          body: {
            value: "unauthorized-attempt",
          } satisfies IEconPoliticalForumSiteSetting.IUpdate,
        },
      );
    },
  );
}
