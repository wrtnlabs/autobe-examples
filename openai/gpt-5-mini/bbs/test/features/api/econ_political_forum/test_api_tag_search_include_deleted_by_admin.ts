import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumTag";

/**
 * Validate that administrators can search for soft-deleted tags using
 * includeDeleted=true while public callers cannot see soft-deleted tags nor may
 * they use includeDeleted=true.
 *
 * Steps:
 *
 * 1. Register an administrator account via POST /auth/administrator/join
 * 2. Create a tag as administrator via POST /econPoliticalForum/administrator/tags
 * 3. Soft-delete the created tag via DELETE
 *    /econPoliticalForum/administrator/tags/:tagId
 * 4. As administrator, PATCH /econPoliticalForum/tags with includeDeleted=true and
 *    assert the deleted tag is returned in results
 * 5. As public (unauthenticated), assert includeDeleted=true is forbidden
 * 6. As public, search without includeDeleted and assert the deleted tag is NOT
 *    returned
 */
export async function test_api_tag_search_include_deleted_by_admin(
  connection: api.IConnection,
) {
  // 1) Administrator registration
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassw0rd!"; // meets minLength<10>
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    username: RandomGenerator.alphaNumeric(8),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const adminAuth: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 2) Create a tag as admin
  const createBody = {
    name: "temp-deleted-tag",
    slug: "temp-deleted-tag",
    description: "Temporary tag for deletion test",
  } satisfies IEconPoliticalForumTag.ICreate;

  const createdTag: IEconPoliticalForumTag =
    await api.functional.econPoliticalForum.administrator.tags.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdTag);

  // 3) Soft-delete the created tag
  await api.functional.econPoliticalForum.administrator.tags.erase(connection, {
    tagId: createdTag.id,
  });

  // 4) As admin: search including deleted items
  const adminSearchBody = {
    q: "temp-deleted-tag",
    includeDeleted: true,
    page: 1,
    limit: 20,
  } satisfies IEconPoliticalForumTag.IRequest;

  const adminPage: IPageIEconPoliticalForumTag.ISummary =
    await api.functional.econPoliticalForum.tags.index(connection, {
      body: adminSearchBody,
    });
  typia.assert(adminPage);

  const foundInAdmin = adminPage.data.find((s) => s.id === createdTag.id);
  // Ensure the deleted tag is present in admin results
  typia.assert(foundInAdmin!);
  TestValidator.equals(
    "admin: deleted tag id matches created id",
    foundInAdmin!.id,
    createdTag.id,
  );
  TestValidator.equals(
    "admin: deleted tag name matches",
    foundInAdmin!.name,
    createBody.name,
  );
  TestValidator.equals(
    "admin: deleted tag slug matches",
    foundInAdmin!.slug,
    createBody.slug,
  );

  // 5) As public: attempting to use includeDeleted=true should be forbidden
  const publicConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "public cannot request includeDeleted=true",
    async () => {
      await api.functional.econPoliticalForum.tags.index(publicConn, {
        body: {
          q: "temp-deleted-tag",
          includeDeleted: true,
          page: 1,
          limit: 20,
        } satisfies IEconPoliticalForumTag.IRequest,
      });
    },
  );

  // 6) As public: search without includeDeleted — deleted tag must NOT appear
  const publicSearchBody = {
    q: "temp-deleted-tag",
    page: 1,
    limit: 20,
  } satisfies IEconPoliticalForumTag.IRequest;

  const publicPage: IPageIEconPoliticalForumTag.ISummary =
    await api.functional.econPoliticalForum.tags.index(publicConn, {
      body: publicSearchBody,
    });
  typia.assert(publicPage);

  TestValidator.predicate(
    "public: soft-deleted tag is not present in list",
    publicPage.data.find((s) => s.id === createdTag.id) === undefined,
  );
}
