import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAppeal";

export async function test_api_moderation_action_appeals_search_authorization_required(
  connection: api.IConnection,
) {
  // 1. Prepare a reusable search request body for appeals.
  const requestBody = {
    page: typia.random<number & tags.Type<"int32">>(),
    limit: typia.random<number & tags.Type<"int32">>(),
    sortField: "created_at",
    sortOrder: "desc",
    statuses: ["pending", "approved", "rejected"],
    moderationActionId: undefined,
    moderationCaseId: undefined,
    appellantMemberUserId: undefined,
    reviewerAdminUserId: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    resolvedFrom: undefined,
    resolvedTo: undefined,
    searchText: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformAppeal.IRequest;

  const moderationActionId = typia.random<string & tags.Format<"uuid">>();

  // 2. Build an unauthenticated connection by cloning the incoming connection
  //    and clearing headers so that no Authorization is sent.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Call the appeals search endpoint WITHOUT authentication and verify
  //    that it fails due to missing adminUser authorization.
  await TestValidator.error(
    "appeals search without admin auth must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.moderationActions.appeals.index(
        unauthenticatedConnection,
        {
          moderationActionId,
          body: requestBody,
        },
      );
    },
  );

  // 4. Join as an adminUser to obtain an authorized admin context.
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 5. With the now-authenticated admin connection (original `connection`
  //    has had its Authorization header set by join), call the appeals search
  //    endpoint again and ensure it succeeds.
  const successOutput: IPageICommunityPlatformAppeal.ISummary =
    await api.functional.communityPlatform.adminUser.moderationActions.appeals.index(
      connection,
      {
        moderationActionId,
        body: requestBody,
      },
    );

  // 6. Validate the response type and some basic business expectations.
  typia.assert<IPageICommunityPlatformAppeal.ISummary>(successOutput);
  typia.assert<IPage.IPagination>(successOutput.pagination);

  TestValidator.predicate(
    "pagination limit must be non-negative",
    successOutput.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination current page must be non-negative",
    successOutput.pagination.current >= 0,
  );

  if (successOutput.data.length > 0) {
    const firstAppeal = successOutput.data[0];
    typia.assert<ICommunityPlatformAppeal.ISummary>(firstAppeal);
    TestValidator.predicate(
      "appeal status should be one of the expected values",
      ["pending", "approved", "rejected"].includes(firstAppeal.status),
    );
  }
}
