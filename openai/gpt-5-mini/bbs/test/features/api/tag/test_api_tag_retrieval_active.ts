import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumTag";

export async function test_api_tag_retrieval_active(
  connection: api.IConnection,
) {
  // 1) Administrator registration (create admin account)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "StrongPassw0rd",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2) Create a deterministic, unique tag using administrator endpoint
  const uniqueSuffix = RandomGenerator.alphabets(6);
  const tagCreateBody = {
    name: `public-tag-${uniqueSuffix}`,
    slug: `public-tag-${uniqueSuffix}`,
    description: "Tag for retrieval test",
  } satisfies IEconPoliticalForumTag.ICreate;

  const createdTag: IEconPoliticalForumTag =
    await api.functional.econPoliticalForum.administrator.tags.create(
      connection,
      {
        body: tagCreateBody,
      },
    );
  typia.assert(createdTag);

  // 3) Public (unauthenticated) retrieval: clone connection with empty headers
  const publicConn: api.IConnection = { ...connection, headers: {} };

  const retrieved: IEconPoliticalForumTag =
    await api.functional.econPoliticalForum.tags.at(publicConn, {
      tagId: createdTag.id,
    });
  typia.assert(retrieved);

  // 4) Business assertions
  TestValidator.equals(
    "retrieved tag id should match created tag id",
    retrieved.id,
    createdTag.id,
  );
  TestValidator.equals(
    "retrieved tag name should match",
    retrieved.name,
    createdTag.name,
  );
  TestValidator.equals(
    "retrieved tag slug should match",
    retrieved.slug,
    createdTag.slug,
  );
  TestValidator.equals(
    "retrieved tag description should match",
    retrieved.description,
    createdTag.description,
  );

  // created_at and updated_at are type-validated by typia.assert; assert presence
  TestValidator.predicate(
    "created_at is present",
    typeof retrieved.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is present",
    typeof retrieved.updated_at === "string",
  );

  // deleted_at must be null or undefined for an active tag
  TestValidator.predicate(
    "deleted_at is null or absent for active tag",
    retrieved.deleted_at === null || retrieved.deleted_at === undefined,
  );

  // Note: No explicit DB access available in this test. Equality between
  // creation response and retrieval response demonstrates the DB row exists
  // and is active. Teardown is left to test environment reset.
}
