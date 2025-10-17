import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAuditLog";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumTag";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalForumAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumAuditLog";

export async function test_api_tag_soft_delete_by_administrator(
  connection: api.IConnection,
) {
  // 1) Admin registration & authentication
  const adminAuth: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "P@ssword12345", // satisfies MinLength<10>
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(adminAuth);

  // 2) Create tag as administrator
  const createBody = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 10 }),
    slug: RandomGenerator.alphabets(10).toLowerCase(),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IEconPoliticalForumTag.ICreate;

  const created: IEconPoliticalForumTag =
    await api.functional.econPoliticalForum.administrator.tags.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Validate created values
  TestValidator.equals(
    "created tag name matches request",
    created.name,
    createBody.name,
  );
  TestValidator.equals(
    "created tag slug matches request",
    created.slug,
    createBody.slug,
  );

  // 3) Soft-delete the tag (erase)
  await api.functional.econPoliticalForum.administrator.tags.erase(connection, {
    tagId: created.id,
  });

  // 4) Confirm audit/moderation record created (with retry/backoff)
  const auditRequest = {
    page: 1,
    limit: 10,
    query: null,
    target_identifier: created.id,
    target_type: "tag",
    action_type: "delete",
    created_from: null,
    created_to: null,
    created_by_system: null,
    my_items: null,
    sort_by: "created_at",
    sort_order: "desc",
    cursor: null,
  } satisfies IEconPoliticalForumAuditLog.IRequest;

  let found = false;
  let lastPage: IPageIEconPoliticalForumAuditLog | undefined = undefined;
  for (let attempt = 0; attempt < 6; ++attempt) {
    const page: IPageIEconPoliticalForumAuditLog =
      await api.functional.econPoliticalForum.administrator.auditLogs.index(
        connection,
        { body: auditRequest },
      );
    typia.assert(page);
    lastPage = page;

    found = Array.isArray(page.data)
      ? page.data.some((e) => e.target_identifier === created.id)
      : false;

    if (found) break;

    // backoff before retrying
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  TestValidator.predicate(
    "audit log contains deletion entry referencing tagId",
    found,
  );

  // Additional sanity: if audit page present and found, assert the matched entry
  if (found && lastPage) {
    const matched = lastPage.data.find(
      (e) => e.target_identifier === created.id,
    )!;
    typia.assert<IEconPoliticalForumAuditLog>(matched);
    TestValidator.equals(
      "audit entry target_identifier matches tag id",
      matched.target_identifier,
      created.id,
    );
    TestValidator.equals(
      "audit entry target_type is tag",
      matched.target_type,
      "tag",
    );
    TestValidator.equals(
      "audit entry action_type is delete",
      matched.action_type,
      "delete",
    );
  }
}
