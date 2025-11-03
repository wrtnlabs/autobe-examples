import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSettings";

/**
 * Validates that an authenticated platform administrator can retrieve the
 * details for a specific platform setting by its unique key.
 *
 * Workflow:
 *
 * 1. Register as a platform admin via join endpoint with randomized credentials
 *    and context.
 * 2. Create a new platform setting as the authenticated admin, using randomized
 *    valid fields.
 * 3. Retrieve the setting details using its setting_key via the detail endpoint.
 * 4. Assert that all returned fields (key, value, type, is_active, description,
 *    and timestamps) match the created setting.
 */
export async function test_api_platform_setting_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(14),
        display_name: RandomGenerator.name(2),
        href: "https://admin.e2etest.local/", // realistic URI
        referrer: "https://referrer.e2etest.local/",
        ip: null,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new platform setting as this admin
  const settingInput = {
    setting_key: RandomGenerator.alphaNumeric(16),
    value: RandomGenerator.alphaNumeric(8),
    type: RandomGenerator.pick(["int", "boolean", "text", "enum"] as const),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
    is_active: true,
  } satisfies ICommunityPlatformSettings.ICreate;

  const created: ICommunityPlatformSettings =
    await api.functional.communityPlatform.admin.settings.create(connection, {
      body: settingInput,
    });
  typia.assert(created);

  // 3. Retrieve the setting detail by key as admin
  const detail: ICommunityPlatformSettings =
    await api.functional.communityPlatform.admin.settings.at(connection, {
      settingKey: created.setting_key,
    });
  typia.assert(detail);

  // 4. Assert that all fields returned match the created setting
  TestValidator.equals(
    "setting_key matches",
    detail.setting_key,
    created.setting_key,
  );
  TestValidator.equals("value matches", detail.value, created.value);
  TestValidator.equals("type matches", detail.type, created.type);
  TestValidator.equals(
    "description matches",
    detail.description,
    created.description,
  );
  TestValidator.equals(
    "is_active matches",
    detail.is_active,
    created.is_active,
  );
  TestValidator.predicate(
    "id is a valid uuid",
    typeof detail.id === "string" && detail.id.length > 0,
  );
  TestValidator.predicate(
    "created_at is a valid ISO string",
    typeof detail.created_at === "string" && detail.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is a valid ISO string",
    typeof detail.updated_at === "string" && detail.updated_at.length > 0,
  );
}
