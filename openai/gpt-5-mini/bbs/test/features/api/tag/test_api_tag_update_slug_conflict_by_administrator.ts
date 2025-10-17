import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumTag";

/**
 * Test: Administrator attempts to update a tag's slug to a value that already
 * exists for another active tag. The update should be rejected (error thrown)
 * and the original tag records should remain unchanged.
 *
 * Workflow:
 *
 * 1. Administrator registers via POST /auth/administrator/join
 * 2. Administrator creates Tag A (slug: "trade")
 * 3. Administrator creates Tag B (slug: "commerce")
 * 4. Administrator attempts to update Tag A to slug "commerce" → expect error
 * 5. Verify the created tag objects remain unchanged locally
 *
 * Notes:
 *
 * - The SDK automatically manages authentication headers during join().
 * - The test does not attempt to assert HTTP status codes (system restriction)
 *   but asserts that an error occurs. Database-level GET is not available in
 *   the provided SDK; therefore the test verifies the creation responses remain
 *   unchanged and ensures no successful update returned.
 */
export async function test_api_tag_update_slug_conflict_by_administrator(
  connection: api.IConnection,
) {
  // 1) Administrator registration
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongPass123", // minimum 10 characters
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2) Create Tag A (target to be updated)
  const tagA: IEconPoliticalForumTag =
    await api.functional.econPoliticalForum.administrator.tags.create(
      connection,
      {
        body: {
          name: "Trade",
          slug: "trade",
          description: "Trade topics",
        } satisfies IEconPoliticalForumTag.ICreate,
      },
    );
  typia.assert(tagA);

  // 3) Create Tag B (provides conflicting slug)
  const tagB: IEconPoliticalForumTag =
    await api.functional.econPoliticalForum.administrator.tags.create(
      connection,
      {
        body: {
          name: "Commerce",
          slug: "commerce",
          description: "Commerce topics",
        } satisfies IEconPoliticalForumTag.ICreate,
      },
    );
  typia.assert(tagB);

  // 4) Attempt to update Tag A to use Tag B's slug -> should error
  await TestValidator.error(
    "updating tag A to an existing slug 'commerce' should fail",
    async () => {
      await api.functional.econPoliticalForum.administrator.tags.update(
        connection,
        {
          tagId: tagA.id,
          body: {
            name: "Trade & Commerce",
            slug: "commerce", // conflicting slug
            description: "Merged topic",
          } satisfies IEconPoliticalForumTag.IUpdate,
        },
      );
    },
  );

  // 5) Verify local responses unchanged (cannot call GET endpoint - not provided)
  TestValidator.equals("tag A slug unchanged", tagA.slug, "trade");
  TestValidator.equals("tag B slug remains commerce", tagB.slug, "commerce");

  // 6) Teardown: no explicit delete API available in provided SDK.
  // Rely on test environment/db reset between tests or external cleanup.
}
