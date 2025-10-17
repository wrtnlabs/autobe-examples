import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumCategory";

export async function test_api_category_index_public_and_admin_include_deleted(
  connection: api.IConnection,
) {
  // 1) Administrator registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(2),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const adminAuth: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 2) Create test category using admin privileges
  const createBody = {
    name: "Test Category A",
    slug: "test-category-a",
    description: "Temporary category for E2E test",
    is_moderated: false,
    requires_verification: false,
    order: 10,
  } satisfies IEconPoliticalForumCategory.ICreate;

  const created: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);
  TestValidator.equals(
    "created category name matches",
    created.name,
    createBody.name,
  );
  TestValidator.equals(
    "created category slug matches",
    created.slug,
    createBody.slug,
  );

  // 3) Public listing (unauthenticated) should include the created category
  const publicConn: api.IConnection = { ...connection, headers: {} };

  const publicList: IPageIEconPoliticalForumCategory.ISummary =
    await api.functional.econPoliticalForum.categories.index(publicConn, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IEconPoliticalForumCategory.IRequest,
    });
  typia.assert(publicList);

  TestValidator.predicate(
    "public listing contains created category",
    publicList.data.some((c) => c.id === created.id),
  );

  // 4) Unauthenticated includeDeleted attempt must be forbidden (403)
  await TestValidator.httpError(
    "includeDeleted forbidden for public clients",
    403,
    async () => {
      await api.functional.econPoliticalForum.categories.index(publicConn, {
        body: {
          includeDeleted: true,
        } satisfies IEconPoliticalForumCategory.IRequest,
      });
    },
  );

  // 5) Soft-delete the category (admin)
  await api.functional.econPoliticalForum.administrator.categories.erase(
    connection,
    { categoryId: created.id },
  );

  // 6) Public listing should no longer include the deleted category
  const publicListAfterDelete: IPageIEconPoliticalForumCategory.ISummary =
    await api.functional.econPoliticalForum.categories.index(publicConn, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IEconPoliticalForumCategory.IRequest,
    });
  typia.assert(publicListAfterDelete);

  TestValidator.predicate(
    "public listing does not contain deleted category",
    !publicListAfterDelete.data.some((c) => c.id === created.id),
  );

  // 7) Admin listing with includeDeleted=true should include the deleted row
  const adminListWithDeleted: IPageIEconPoliticalForumCategory.ISummary =
    await api.functional.econPoliticalForum.categories.index(connection, {
      body: {
        includeDeleted: true,
        page: 1,
        limit: 20,
      } satisfies IEconPoliticalForumCategory.IRequest,
    });
  typia.assert(adminListWithDeleted);

  TestValidator.predicate(
    "admin listing includes previously deleted category",
    adminListWithDeleted.data.some((c) => c.id === created.id),
  );
}
