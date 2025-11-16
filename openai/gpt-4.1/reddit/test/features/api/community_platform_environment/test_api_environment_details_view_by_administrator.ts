import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformEnvironment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformEnvironment";

/**
 * Validate that an administrator can retrieve the details of a single
 * deployment environment by its unique env_key.
 *
 * Steps:
 *
 * 1. Register a new administrator using the join endpoint.
 * 2. Create a new environment using the administrator's credentials.
 * 3. Retrieve the created environment's details via its env_key as an
 *    administrator.
 * 4. Confirm that the response contains all required environment fields (env_key,
 *    display_name, description, creation/modification timestamps, deletion
 *    status) and reflects the data that was created.
 */
export async function test_api_environment_details_view_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Create environment
  const envKey = RandomGenerator.alphaNumeric(10);
  const displayName = RandomGenerator.name();
  const description = RandomGenerator.paragraph({ sentences: 6 });
  const environment =
    await api.functional.communityPlatform.administrator.environments.create(
      connection,
      {
        body: {
          env_key: envKey,
          display_name: displayName,
          description,
        } satisfies ICommunityPlatformEnvironment.ICreate,
      },
    );
  typia.assert(environment);

  // 3. Retrieve environment by env_key
  const detail =
    await api.functional.communityPlatform.administrator.environments.at(
      connection,
      {
        envKey: envKey,
      },
    );
  typia.assert(detail);

  // 4. Validate fields
  TestValidator.equals("env_key matches", detail.env_key, envKey);
  TestValidator.equals(
    "display_name matches",
    detail.display_name,
    displayName,
  );
  TestValidator.equals("description matches", detail.description, description);
  TestValidator.predicate(
    "created_at is valid ISO 8601 string",
    typeof detail.created_at === "string" &&
      !Number.isNaN(Date.parse(detail.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 string",
    typeof detail.updated_at === "string" &&
      !Number.isNaN(Date.parse(detail.updated_at)),
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    detail.deleted_at,
    null,
  );
}
