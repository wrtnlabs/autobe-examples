import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumTag";

export async function test_api_tag_creation_by_administrator(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Register a new administrator (POST /auth/administrator/join)
   * - Create a new tag as that administrator (POST
   *   /econPoliticalForum/administrator/tags)
   * - Validate response shape and business fields
   * - Verify duplicate creation is rejected by the business layer
   *
   * Notes:
   *
   * - Uses only provided SDK functions and imported utilities
   * - Does NOT touch connection.headers directly
   */

  // 1) Administrator registration (join)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12); // satisfies MinLength<10>

  const administrator: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(administrator);

  // Basic sanity: authorized response contains token and id
  TestValidator.predicate(
    "administrator authorization has token and id",
    typeof administrator.id === "string" &&
      typeof administrator.token?.access === "string",
  );

  // 2) Create a tag as administrator
  const createBody = {
    name: "Economic Policy",
    slug: "economic-policy",
    description: "Tags for economic policy discussions",
  } satisfies IEconPoliticalForumTag.ICreate;

  const createdTag: IEconPoliticalForumTag =
    await api.functional.econPoliticalForum.administrator.tags.create(
      connection,
      {
        body: createBody,
      },
    );

  // Validate full response type
  typia.assert(createdTag);

  // Business assertions
  TestValidator.equals(
    "created tag name matches input",
    createdTag.name,
    createBody.name,
  );
  TestValidator.equals(
    "created tag slug matches input",
    createdTag.slug,
    createBody.slug,
  );

  // created_at and updated_at presence is ensured by typia.assert; add predicate for non-empty strings
  TestValidator.predicate(
    "created_at is a non-empty string",
    typeof createdTag.created_at === "string" &&
      createdTag.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is a non-empty string",
    typeof createdTag.updated_at === "string" &&
      createdTag.updated_at.length > 0,
  );

  // 3) Attempt to create duplicate tag and expect a business error (uniqueness)
  await TestValidator.error("duplicate tag creation should fail", async () => {
    await api.functional.econPoliticalForum.administrator.tags.create(
      connection,
      {
        body: createBody,
      },
    );
  });

  // Teardown note: No delete endpoint provided in SDK materials. Test runner should handle DB cleanup or run tests against isolated DB/schema.
}
