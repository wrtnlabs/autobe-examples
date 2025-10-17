import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumTag";

/**
 * Test that retrieving a soft-deleted tag returns 404 for public callers.
 *
 * Business context:
 *
 * - Tags are used for discovery and should be hidden from public consumers once
 *   soft-deleted (deleted_at set). Administrators may have additional
 *   capabilities to view archived resources via privileged endpoints, but the
 *   public read endpoint must not expose deleted tags.
 *
 * Process:
 *
 * 1. Register an administrator account (POST /auth/administrator/join).
 * 2. Create a tag via administrator endpoint (POST
 *    /econPoliticalForum/administrator/tags).
 * 3. Soft-delete the tag (DELETE /econPoliticalForum/administrator/tags/:tagId).
 * 4. Attempt public GET of the tag (unauthenticated) and expect 404.
 * 5. Attempt admin GET of the tag (authenticated):
 *
 *    - If admin GET succeeds, expect returned IEconPoliticalForumTag to have
 *         deleted_at set.
 *    - If admin GET fails, expect a 404 (API may hide archived records even for the
 *         same public endpoint).
 */
export async function test_api_tag_retrieval_returns_404_for_deleted(
  connection: api.IConnection,
) {
  // 1) Administrator registration
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!",
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  // At this point, SDK sets connection.headers.Authorization = admin.token.access

  // 2) Create a deterministic tag to be deleted
  const createBody = {
    name: "will-be-deleted",
    slug: "will-be-deleted",
  } satisfies IEconPoliticalForumTag.ICreate;

  const created: IEconPoliticalForumTag =
    await api.functional.econPoliticalForum.administrator.tags.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // 3) Soft-delete the created tag (administrator)
  await api.functional.econPoliticalForum.administrator.tags.erase(connection, {
    tagId: created.id,
  });

  // 4) Public GET should return 404
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.httpError(
    "public get should return 404 for soft-deleted tag",
    404,
    async () => {
      await api.functional.econPoliticalForum.tags.at(unauthConn, {
        tagId: created.id,
      });
    },
  );

  // 5) Admin GET: try to fetch with admin credentials. Two acceptable outcomes:
  //    a) API returns the archived record (200) and deleted_at is present
  //    b) API returns 404 (administrative retrieval not exposed via this endpoint)
  try {
    const adminView: IEconPoliticalForumTag =
      await api.functional.econPoliticalForum.tags.at(connection, {
        tagId: created.id,
      });
    // If we get here, admin can view it via this endpoint — ensure deleted_at is set
    typia.assert(adminView);
    TestValidator.predicate(
      "admin view includes deleted_at when archived",
      adminView.deleted_at !== null && adminView.deleted_at !== undefined,
    );
  } catch {
    // If admin GET fails, assert that it fails with 404 as a valid behavior
    await TestValidator.httpError(
      "admin GET of soft-deleted tag should return 404 when endpoint hides archived records",
      404,
      async () => {
        await api.functional.econPoliticalForum.tags.at(connection, {
          tagId: created.id,
        });
      },
    );
  }

  // Note: Direct DB assertion of econ_political_forum_tags.deleted_at is not
  // available through the provided SDK. The test relies on API-level
  // observable behavior (404 to public, optional admin visibility) to confirm
  // the soft-delete semantics. If a DB-level check is available in CI, it may
  // be added as a follow-up step.
}
