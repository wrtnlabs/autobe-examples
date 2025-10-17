import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumTag";

/**
 * Validate administrator tag update success.
 *
 * Business context:
 *
 * - Administrators maintain the tag taxonomy used across the forum. This test
 *   verifies that an administrator can update a tag's mutable fields (name,
 *   slug, description) and that the API returns the updated resource with an
 *   advanced updated_at timestamp while preserving the tag's id.
 *
 * Steps:
 *
 * 1. Register a new administrator using POST /auth/administrator/join.
 * 2. Create an initial tag via POST /econPoliticalForum/administrator/tags.
 * 3. Update the created tag via PUT
 *    /econPoliticalForum/administrator/tags/{tagId}.
 * 4. Validate the update response and business invariants (id preserved, fields
 *    updated, updated_at advanced, deleted_at null).
 *
 * Notes:
 *
 * - The SDK in provided materials does not expose audit-log reads or delete
 *   endpoints. Therefore, DB-side audit log verification and teardown (soft-
 *   delete) are not performed in this test; they must be covered by separate
 *   infrastructure-level checks or additional APIs.
 */
export async function test_api_tag_update_by_administrator_success(
  connection: api.IConnection,
) {
  // 1) Administrator registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: "StrongP@ssw0rd!", // >= 10 chars as required
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
    } satisfies IEconPoliticalForumAdministrator.IJoin,
  });
  typia.assert(adminJoin);

  // Ensure we have an authorized admin and SDK attached token (SDK sets token on connection)
  typia.assert<IEconPoliticalForumAdministrator.IAuthorized>(adminJoin);

  // 2) Create initial tag
  const createBody = {
    name: "Fiscal",
    slug: "fiscal",
    description: "Fiscal topics",
  } satisfies IEconPoliticalForumTag.ICreate;

  const createdTag: IEconPoliticalForumTag =
    await api.functional.econPoliticalForum.administrator.tags.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdTag);

  // Preserve original updated_at for comparison
  const originalUpdatedAt = createdTag.updated_at;

  // 3) Update the tag
  const updateBody = {
    name: "Fiscal Policy",
    slug: "fiscal-policy",
    description: "Fiscal policy discussions",
  } satisfies IEconPoliticalForumTag.IUpdate;

  const updatedTag: IEconPoliticalForumTag =
    await api.functional.econPoliticalForum.administrator.tags.update(
      connection,
      {
        tagId: createdTag.id,
        body: updateBody,
      },
    );
  typia.assert(updatedTag);

  // 4) Assertions (business validations)
  TestValidator.equals(
    "updated tag id preserved",
    updatedTag.id,
    createdTag.id,
  );
  TestValidator.equals("name updated", updatedTag.name, "Fiscal Policy");
  TestValidator.equals("slug updated", updatedTag.slug, "fiscal-policy");
  TestValidator.equals(
    "description updated",
    updatedTag.description,
    "Fiscal policy discussions",
  );

  // deleted_at should remain null for an active tag
  TestValidator.equals("deleted_at is null", updatedTag.deleted_at, null);

  // updated_at should be later than original
  TestValidator.predicate(
    "updated_at advanced",
    Date.parse(updatedTag.updated_at) > Date.parse(originalUpdatedAt),
  );

  // NOTE: Audit-log verification and teardown (soft-delete) are NOT possible
  // with the provided SDK functions. Those checks are intentionally omitted.
}
