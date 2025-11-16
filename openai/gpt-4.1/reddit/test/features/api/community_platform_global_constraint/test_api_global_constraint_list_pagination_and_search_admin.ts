import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformGlobalConstraint } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGlobalConstraint";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformGlobalConstraint } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGlobalConstraint";

export async function test_api_global_constraint_list_pagination_and_search_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as administrator
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    business_status: RandomGenerator.name(1),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminInput,
    });
  typia.assert(admin);

  // 2. List global constraints with different queries
  // (1) Basic list, first page, default ascending by constraint_key
  const listReq1 = {
    offset: 0,
    limit: 10,
    order_by: "constraint_key",
    order: "asc",
  } satisfies ICommunityPlatformGlobalConstraint.IRequest;
  const listOut1 =
    await api.functional.communityPlatform.administrator.globalConstraints.index(
      connection,
      { body: listReq1 },
    );
  typia.assert(listOut1);
  TestValidator.predicate(
    "pagination structure present",
    !!listOut1.pagination,
  );
  TestValidator.predicate("at least zero records", listOut1.data.length >= 0);

  // (2) If there is at least one result, filter by its constraint_key
  if (listOut1.data.length > 0) {
    const key = listOut1.data[0].constraint_key;
    const filterKeyReq = {
      ...listReq1,
      constraint_key: key,
    } satisfies ICommunityPlatformGlobalConstraint.IRequest;
    const keyOut =
      await api.functional.communityPlatform.administrator.globalConstraints.index(
        connection,
        { body: filterKeyReq },
      );
    typia.assert(keyOut);
    TestValidator.predicate(
      "filtered by constraint_key all match",
      keyOut.data.every((item) => item.constraint_key === key),
    );
  }

  // (3) Filter by constraint_type if exists
  if (listOut1.data.length > 0) {
    const constraintTypes = Array.from(
      new Set(listOut1.data.map((r) => r.constraint_type)),
    );
    const anyType = constraintTypes[0];
    const filterTypeReq = {
      ...listReq1,
      constraint_type: anyType,
    } satisfies ICommunityPlatformGlobalConstraint.IRequest;
    const typeOut =
      await api.functional.communityPlatform.administrator.globalConstraints.index(
        connection,
        { body: filterTypeReq },
      );
    typia.assert(typeOut);
    TestValidator.predicate(
      "filtered by constraint_type all match",
      typeOut.data.every((item) => item.constraint_type === anyType),
    );
  }

  // (4) Text search (q) by picking a substring from a random description/key/value
  if (listOut1.data.length > 0) {
    const sample = listOut1.data[0];
    // Pick candidate fields to sample substring from
    const qSource = sample.description ?? sample.constraint_key;
    // Prevent empty q
    if (qSource.length > 0) {
      const qStr = RandomGenerator.substring(qSource);
      const searchReq = {
        ...listReq1,
        q: qStr,
      } satisfies ICommunityPlatformGlobalConstraint.IRequest;
      const searchOut =
        await api.functional.communityPlatform.administrator.globalConstraints.index(
          connection,
          { body: searchReq },
        );
      typia.assert(searchOut);
      // All should have keyword in one of the text searchable fields
      TestValidator.predicate(
        "text search keyword found in key or description or value",
        searchOut.data.every(
          (item) =>
            item.constraint_key.includes(qStr) ||
            item.description?.includes(qStr) ||
            item.constraint_value.includes(qStr),
        ),
      );
    }
  }

  // (5) Pagination: offset/limit, get second page
  const reqPage2 = {
    ...listReq1,
    offset: listReq1.limit,
  } satisfies ICommunityPlatformGlobalConstraint.IRequest;
  const page2Out =
    await api.functional.communityPlatform.administrator.globalConstraints.index(
      connection,
      { body: reqPage2 },
    );
  typia.assert(page2Out);
  TestValidator.equals(
    "partial pagination page count",
    page2Out.pagination.current,
    reqPage2.offset,
  );

  // (6) Sorting: order_by as updated_at descending
  const reqDescSort = {
    ...listReq1,
    order_by: "updated_at",
    order: "desc",
  } satisfies ICommunityPlatformGlobalConstraint.IRequest;
  const descSortOut =
    await api.functional.communityPlatform.administrator.globalConstraints.index(
      connection,
      { body: reqDescSort },
    );
  typia.assert(descSortOut);
  if (descSortOut.data.length > 1) {
    for (let i = 1; i < descSortOut.data.length; ++i) {
      TestValidator.predicate(
        `sorted desc by updated_at: data[${i - 1}].updated_at >= data[${i}].updated_at`,
        descSortOut.data[i - 1].updated_at >= descSortOut.data[i].updated_at,
      );
    }
  }

  // 4. Access denied for unauthenticated (empty headers) access
  const noAuthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated administrator cannot list global constraints",
    async () => {
      await api.functional.communityPlatform.administrator.globalConstraints.index(
        noAuthConn,
        { body: listReq1 },
      );
    },
  );
}
