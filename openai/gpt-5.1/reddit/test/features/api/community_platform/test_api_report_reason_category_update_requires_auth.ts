import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Verify that updating a report reason category requires platformAdmin
 * authentication and that unauthenticated requests cannot modify persisted
 * data.
 *
 * Business context: Report reason categories define standardized reasons (for
 * example, `"spam"`, `"harassment"`, or `"illegal_content"`) that users and
 * moderators select when reporting content or accounts. Because these
 * categories drive moderation workflows and analytics, only platform-level
 * administrators should be able to modify them.
 *
 * Test flow:
 *
 * 1. Register a new platform admin using POST /auth/platformAdmin/join.
 *
 *    - The SDK automatically attaches a valid JWT access token to the connection
 *         headers and returns an IAuthorized admin DTO.
 * 2. With this authenticated connection, create a new report reason category using
 *    POST /communityPlatform/platformAdmin/reportReasonCategories.
 *
 *    - Capture the returned ICommunityPlatformReportReasonCategory, including its
 *         `code` (business key) and `id` (UUID primary key).
 * 3. Construct an unauthenticated connection by shallow-cloning the original
 *    connection but replacing `headers` with an empty object literal.
 *
 *    - This simulates a completely unauthenticated client without mutating the
 *         primary connection instance.
 * 4. Build a deterministic ICommunityPlatformReportReasonCategory.IUpdate payload
 *    that changes multiple mutable fields: `name`, `description`,
 *    `is_user_visible`, and `is_active`.
 * 5. Attempt to call PUT
 *    /communityPlatform/platformAdmin/reportReasonCategories/{reportReasonCategoryCode}
 *    using the unauthenticated connection and the known `code` value.
 *
 *    - Wrap this call in `await TestValidator.error("unauthenticated update must
 *         fail", async () => ...)`.
 *    - Do not assert specific HTTP status codes; only that an error is thrown.
 * 6. Re-run the same update call using the authenticated admin connection.
 *
 *    - Expect the call to succeed and return an updated
 *         ICommunityPlatformReportReasonCategory.
 *    - Use `typia.assert` on the response to guarantee type conformity.
 * 7. Validate identity invariants and field changes:
 *
 *    - `id` remains equal to the original category `id`.
 *    - `code` remains equal to the original category `code`.
 *    - `name`, `description`, `is_user_visible`, and `is_active` all reflect the
 *         values from the update payload.
 */
export async function test_api_report_reason_category_update_requires_auth(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and obtain authenticated context
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a report reason category as the authenticated admin
  const createBody = {
    code: `code_${RandomGenerator.alphabets(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const created: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // 3. Prepare an unauthenticated connection by clearing headers
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Prepare deterministic update payload
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    is_user_visible: false,
    is_active: false,
  } satisfies ICommunityPlatformReportReasonCategory.IUpdate;

  // 5. Unauthorized update attempt - must fail
  await TestValidator.error("unauthenticated update must fail", async () => {
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.update(
      unauthenticated,
      {
        reportReasonCategoryCode: created.code,
        body: updateBody,
      },
    );
  });

  // 6. Authorized update attempt - must succeed
  const updated: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.update(
      connection,
      {
        reportReasonCategoryCode: created.code,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 7. Validate identity invariants and field updates
  TestValidator.equals(
    "category id must remain stable after update",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "category code must remain stable after update",
    updated.code,
    created.code,
  );
  TestValidator.equals(
    "name must reflect update payload",
    updated.name,
    updateBody.name,
  );
  TestValidator.equals(
    "description must reflect update payload",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "is_user_visible must reflect update payload",
    updated.is_user_visible,
    updateBody.is_user_visible,
  );
  TestValidator.equals(
    "is_active must reflect update payload",
    updated.is_active,
    updateBody.is_active,
  );
}
