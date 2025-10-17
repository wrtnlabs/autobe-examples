import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_category_update_by_administrator(
  connection: api.IConnection,
) {
  // 1) Administrator sign-up (creates Authorization header via SDK)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "strongP@sswd1",
        username: RandomGenerator.name(1)
          .toLowerCase()
          .replace(/\s+/g, "")
          .slice(0, 30),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2) Create a baseline category to update
  const createBody = {
    code: null,
    name: "Trade Policy",
    slug: "trade-policy",
    description: "Trade and tariffs discussion",
    is_moderated: false,
    requires_verification: false,
    order: 20,
  } satisfies IEconPoliticalForumCategory.ICreate;

  const created: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);

  // Basic response checks
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
  TestValidator.predicate(
    "created category active (deleted_at is null)",
    created.deleted_at === null || created.deleted_at === undefined,
  );

  // 3) Update the category with new metadata
  const updateBody = {
    name: "International Trade & Policy",
    slug: "international-trade",
    description: "Expanded trade policy topics",
    is_moderated: true,
    requires_verification: true,
    order: 5,
  } satisfies IEconPoliticalForumCategory.IUpdate;

  const updated: IEconPoliticalForumCategory =
    await api.functional.econPoliticalForum.administrator.categories.update(
      connection,
      {
        categoryId: created.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4) Validate update results
  TestValidator.equals("updated category id unchanged", updated.id, created.id);
  TestValidator.equals("updated category name", updated.name, updateBody.name);
  TestValidator.equals("updated category slug", updated.slug, updateBody.slug);
  TestValidator.equals(
    "updated is_moderated",
    updated.is_moderated,
    updateBody.is_moderated,
  );
  TestValidator.equals(
    "updated requires_verification",
    updated.requires_verification,
    updateBody.requires_verification,
  );
  TestValidator.equals(
    "updated order matches",
    updated.order,
    updateBody.order,
  );
  TestValidator.equals(
    "created_at unchanged after update",
    created.created_at,
    updated.created_at,
  );
  TestValidator.predicate(
    "updated_at changed after update",
    updated.updated_at !== created.updated_at,
  );
  TestValidator.predicate(
    "deleted_at remains null",
    updated.deleted_at === null || updated.deleted_at === undefined,
  );

  // 5) Business rule: slug uniqueness -> creating another category with same slug should fail
  const duplicateSlugBody = {
    name: "Other Category",
    slug: updateBody.slug, // intentionally duplicate
    is_moderated: false,
    requires_verification: false,
    order: 30,
  } satisfies IEconPoliticalForumCategory.ICreate;

  await TestValidator.error("duplicate slug should fail", async () => {
    await api.functional.econPoliticalForum.administrator.categories.create(
      connection,
      { body: duplicateSlugBody },
    );
  });

  // 6) Authorization: unauthenticated or non-admin cannot update category
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("non-admin cannot update category", async () => {
    await api.functional.econPoliticalForum.administrator.categories.update(
      unauthConn,
      {
        categoryId: created.id,
        body: updateBody,
      },
    );
  });
}
