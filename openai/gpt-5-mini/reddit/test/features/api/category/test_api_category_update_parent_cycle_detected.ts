import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityCategory";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function test_api_category_update_parent_cycle_detected(
  connection: api.IConnection,
) {
  /**
   * Purpose: Ensure the system rejects attempts to update a category's parent
   * when the assignment would create a cycle in the parent-child graph.
   *
   * Workflow:
   *
   * 1. Provision a system admin via /auth/systemAdmin/join
   * 2. Create a parent category
   * 3. Create a child category that references the parent via parent_code
   * 4. Attempt to update the parent category to set its parent_code to the child's
   *    code (cycle attempt)
   * 5. Expect the update to be rejected (TestValidator.error) and verify that the
   *    originally returned creation responses still reflect the intended
   *    parent-child relations. Note: SDK does not provide a GET endpoint for
   *    categories in the provided materials, so server-side read verification
   *    is not possible here; we rely on creation responses and the update
   *    failure to ensure no partial application occurred.
   */

  // 1) Create system administrator (join) and obtain authorization token
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Passw0rd!"; // satisfies min length and pattern (has upper, lower, digit)

  const admin: ICommunityBbsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
      } satisfies ICommunityBbsSystemAdmin.ICreate,
    });
  typia.assert(admin);

  // SDK automatically attaches admin.token.access into connection.headers by join()

  // 2) Create two categories: parent and child
  const ts = Date.now();
  const parentCode = `test-cat-parent-${ts}`;
  const childCode = `test-cat-child-${ts}`;

  const parentCreateBody = {
    code: parentCode,
    title: `Parent Category ${ts}`,
    description: `Parent for cycle test ${ts}`,
  } satisfies ICommunityBbsCommunityCategory.ICreate;

  const parent: ICommunityBbsCommunityCategory =
    await api.functional.communityBbs.systemAdmin.categories.create(
      connection,
      { body: parentCreateBody },
    );
  typia.assert(parent);

  const childCreateBody = {
    code: childCode,
    title: `Child Category ${ts}`,
    description: `Child for cycle test ${ts}`,
    parent_code: parent.code,
  } satisfies ICommunityBbsCommunityCategory.ICreate;

  const child: ICommunityBbsCommunityCategory =
    await api.functional.communityBbs.systemAdmin.categories.create(
      connection,
      { body: childCreateBody },
    );
  typia.assert(child);

  // Sanity: child.parent should reference parent (based on returned summary)
  TestValidator.equals(
    "child parent code equals parent code",
    child.parent?.code,
    parent.code,
  );

  // Parent should have no parent (top-level) in the creation response
  TestValidator.equals(
    "parent has no parent in creation response",
    parent.parent ?? null,
    null,
  );

  // 3) Attempt the problematic update: set parent's parent to the child (cycle)
  await TestValidator.error(
    "updating parent to child should be rejected (cycle prevention)",
    async () => {
      await api.functional.communityBbs.systemAdmin.categories.update(
        connection,
        {
          categoryCode: parent.code,
          body: {
            parent_code: child.code,
          } satisfies ICommunityBbsCommunityCategory.IUpdate,
        },
      );
    },
  );

  // 4) Post-condition: Because we cannot re-fetch via GET (not provided),
  //    assert that our original creation responses still indicate the
  //    original relationships. The update call threw, so the server should
  //    not have applied the change; this is our best-possible verification
  //    given the available SDK surfaces.
  TestValidator.equals(
    "parent still top-level (in-memory) after failed update",
    parent.parent ?? null,
    null,
  );
  TestValidator.equals(
    "child still references parent (in-memory)",
    child.parent?.code,
    parent.code,
  );
}
