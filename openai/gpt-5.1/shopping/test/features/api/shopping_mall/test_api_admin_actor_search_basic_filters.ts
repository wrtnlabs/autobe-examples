import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallActorSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallActorSearch";
import type { IShoppingMallActorSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSearch";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

export async function test_api_admin_actor_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap & authentication via POST /auth/admin/join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuth);

  // 2. Construct base search request body
  const page = 1;
  const limit = 20;

  const queryText = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });

  const searchBody = {
    query: queryText,
    page,
    limit,
  } satisfies IShoppingMallActorSearch.IRequest;

  const pageResult: IPageIShoppingMallActorSearch.ISummary =
    await api.functional.shoppingMall.admin.actors.search.index(connection, {
      body: searchBody,
    });

  // 3. Structural assertion for the response
  typia.assert<IPageIShoppingMallActorSearch.ISummary>(pageResult);

  const { pagination, data } = pageResult;

  // 4. Pagination metadata checks
  TestValidator.equals(
    "pagination current page must equal requested page",
    pagination.current,
    searchBody.page,
  );
  TestValidator.equals(
    "pagination limit must equal requested limit",
    pagination.limit,
    searchBody.limit,
  );

  // records must be >= returned data length
  TestValidator.predicate(
    "pagination.records must be greater than or equal to data.length",
    pagination.records >= data.length,
  );

  // pages and records consistency
  if (pagination.records === 0) {
    TestValidator.equals(
      "when no records, data.length must be 0",
      data.length,
      0,
    );
    TestValidator.predicate(
      "when no records, pages must be 0",
      pagination.pages === 0,
    );
  } else {
    TestValidator.predicate(
      "when records exist, pages must be at least 1",
      pagination.pages >= 1,
    );
  }

  // 5. Row-level validations when we have data
  if (data.length > 0) {
    const validActorTypes = [
      "customer",
      "seller",
      "admin",
      "guestuser",
    ] as const;

    const validStatuses = [
      "active",
      "suspended",
      "disabled",
      "pending",
    ] as const;

    let hasSupportedActorType = false;

    for (const [index, actor] of data.entries()) {
      // typia.assert has already guaranteed structural and format correctness
      // We now enforce additional business-level invariants.
      TestValidator.predicate(
        `actor[${index}].displayName must be non-empty`,
        actor.displayName.length > 0,
      );

      TestValidator.predicate(
        `actor[${index}].createdAt must be non-empty string`,
        actor.createdAt.length > 0,
      );

      const isValidType = validActorTypes.includes(actor.actorType);
      TestValidator.predicate(
        `actor[${index}].actorType must be one of customer|seller|admin|guestuser`,
        isValidType,
      );
      if (isValidType) hasSupportedActorType = true;

      const isValidStatus = validStatuses.includes(actor.status);
      TestValidator.predicate(
        `actor[${index}].status must be one of active|suspended|disabled|pending`,
        isValidStatus,
      );
    }

    TestValidator.predicate(
      "at least one actorType among results must be a supported value",
      hasSupportedActorType,
    );
  }
}
