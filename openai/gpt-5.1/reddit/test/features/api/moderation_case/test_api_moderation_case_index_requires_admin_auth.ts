import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationCase";

export async function test_api_moderation_case_index_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Prepare a simple pagination/filter request body
  const requestBody = {
    page: 0,
    limit: 10,
  } satisfies ICommunityPlatformModerationCase.IRequest;

  // 2. Unauthenticated access: use a cloned connection WITHOUT headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated moderation case index must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.moderationCases.index(
        unauthenticatedConnection,
        {
          body: requestBody,
        },
      );
    },
  );

  // 3. Register and authenticate an adminUser via join
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const authorizedAdmin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedAdmin);

  // 4. Create at least one moderation case so index has data
  const createCaseBody = {
    case_key: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    priority: "high",
    assigned_adminuser_id: authorizedAdmin.id,
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const createdCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: createCaseBody,
      },
    );
  typia.assert(createdCase);

  // 5. Authenticated index call: should now succeed and return at least one case
  const page: IPageICommunityPlatformModerationCase.ISummary =
    await api.functional.communityPlatform.adminUser.moderationCases.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(page);

  const pagination = page.pagination;
  TestValidator.predicate(
    "pagination.current must be non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit must be non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records must be at least 1",
    pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination.pages must be at least 1",
    pagination.pages >= 1,
  );

  TestValidator.predicate(
    "moderation case index should contain at least one summary",
    page.data.length >= 1,
  );
}
