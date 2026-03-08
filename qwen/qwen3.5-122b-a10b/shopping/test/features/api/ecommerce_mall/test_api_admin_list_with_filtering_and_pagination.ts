import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_list_with_filtering_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create base administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>()
      ),
      password: "Password123!",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin1);
  // 2. Create additional admin accounts for testing
  const admin2Email = typia.random<string & tags.Format<"email">>();
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        admin2Email
      ),
      password: "Password123!",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin2);
  const admin3Email = typia.random<string & tags.Format<"email">>();
  const admin3Connection: api.IConnection = { host: connection.host };
  const admin3 = await authorize_admin_join(admin3Connection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        admin3Email
      ),
      password: "Password123!",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin3);
  // 3. Test basic listing with no filters
  const listResponse: IPageIEcommerceMallAdmin.ISummary =
    await api.functional.ecommerceMall.admin.admins.index(adminConnection, {
      body: {} satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(listResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    listResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has records",
    listResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    listResponse.pagination.pages > 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    listResponse.pagination.limit > 0,
  );
  // Validate admin summaries
  TestValidator.predicate(
    "returns admin summaries",
    listResponse.data.length > 0,
  );
  for (const admin of listResponse.data) {
    typia.assert(admin);
    TestValidator.predicate("admin has valid id", admin.id !== undefined);
    TestValidator.predicate("admin has valid email", admin.email !== undefined);
    TestValidator.predicate(
      "admin has admin_grade",
      admin.admin_grade !== undefined,
    );
    TestValidator.predicate(
      "admin has account_status",
      admin.account_status !== undefined,
    );
    TestValidator.predicate(
      "admin has created_at",
      admin.created_at !== undefined,
    );
  }
  // 4. Test email partial matching filter
  const emailSubstring = admin2Email.split("@")[0];
  const emailFilteredResponse: IPageIEcommerceMallAdmin.ISummary =
    await api.functional.ecommerceMall.admin.admins.index(adminConnection, {
      body: { email: emailSubstring } satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(emailFilteredResponse);
  TestValidator.predicate(
    "email filter returns matching results",
    emailFilteredResponse.data.length > 0,
  );
  for (const admin of emailFilteredResponse.data) {
    TestValidator.predicate(
      "all results contain email substring",
      admin.email.includes(emailSubstring),
    );
  }
  // 5. Test account_status filtering
  const activeFilteredResponse: IPageIEcommerceMallAdmin.ISummary =
    await api.functional.ecommerceMall.admin.admins.index(adminConnection, {
      body: { account_status: "active" } satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(activeFilteredResponse);
  for (const admin of activeFilteredResponse.data) {
    TestValidator.equals(
      "all results have active status",
      admin.account_status,
      "active",
    );
  }
  // 6. Test admin_grade filtering
  const regularGradeFilteredResponse: IPageIEcommerceMallAdmin.ISummary =
    await api.functional.ecommerceMall.admin.admins.index(adminConnection, {
      body: { admin_grade: "regular" } satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(regularGradeFilteredResponse);
  for (const admin of regularGradeFilteredResponse.data) {
    TestValidator.equals(
      "all results have regular grade",
      admin.admin_grade,
      "regular",
    );
  }
  // 7. Test combined filters
  const combinedFilteredResponse: IPageIEcommerceMallAdmin.ISummary =
    await api.functional.ecommerceMall.admin.admins.index(adminConnection, {
      body: {
        email: emailSubstring,
        account_status: "active",
        admin_grade: "regular",
      } satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(combinedFilteredResponse);
  for (const admin of combinedFilteredResponse.data) {
    TestValidator.predicate(
      "combined filter: email matches",
      admin.email.includes(emailSubstring),
    );
    TestValidator.equals(
      "combined filter: status is active",
      admin.account_status,
      "active",
    );
    TestValidator.equals(
      "combined filter: grade is regular",
      admin.admin_grade,
      "regular",
    );
  }
  // 8. Test pagination with custom page size
  const customPageSizeResponse: IPageIEcommerceMallAdmin.ISummary =
    await api.functional.ecommerceMall.admin.admins.index(adminConnection, {
      body: { limit: 5 } satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(customPageSizeResponse);
  TestValidator.predicate(
    "custom page size respects limit",
    customPageSizeResponse.data.length <= 5,
  );
  TestValidator.equals(
    "custom page size limit",
    customPageSizeResponse.pagination.limit,
    5,
  );
  // 9. Test sorting by email ascending
  const sortedAscResponse: IPageIEcommerceMallAdmin.ISummary =
    await api.functional.ecommerceMall.admin.admins.index(adminConnection, {
      body: {
        sort: "email",
        order: "asc",
      } satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(sortedAscResponse);
  if (sortedAscResponse.data.length > 1) {
    for (let i = 0; i < sortedAscResponse.data.length - 1; i++) {
      TestValidator.predicate(
        "email sorting ascending",
        sortedAscResponse.data[i].email <= sortedAscResponse.data[i + 1].email,
      );
    }
  }
  // 10. Test sorting by created_at descending (default)
  const sortedDescResponse: IPageIEcommerceMallAdmin.ISummary =
    await api.functional.ecommerceMall.admin.admins.index(adminConnection, {
      body: {
        sort: "created_at",
        order: "desc",
      } satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(sortedDescResponse);
  if (sortedDescResponse.data.length > 1) {
    for (let i = 0; i < sortedDescResponse.data.length - 1; i++) {
      TestValidator.predicate(
        "created_at sorting descending",
        sortedDescResponse.data[i].created_at >=
          sortedDescResponse.data[i + 1].created_at,
      );
    }
  }
  // 11. Test empty result set
  const emptyResultResponse: IPageIEcommerceMallAdmin.ISummary =
    await api.functional.ecommerceMall.admin.admins.index(adminConnection, {
      body: {
        email: "nonexistent-email-xyz123",
      } satisfies IEcommerceMallAdmin.IRequest,
    });
  typia.assert(emptyResultResponse);
  TestValidator.equals(
    "empty result: records count",
    emptyResultResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result: pages count",
    emptyResultResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result: data array length",
    emptyResultResponse.data.length,
    0,
  );
  // 12. Test page size exceeding maximum (should fail)
  await TestValidator.error("page size exceeding maximum", async () => {
    await api.functional.ecommerceMall.admin.admins.index(adminConnection, {
      body: { limit: 101 } satisfies IEcommerceMallAdmin.IRequest,
    });
  });
  // 13. Test invalid account_status filter (should fail)
  await TestValidator.error("invalid account_status filter", async () => {
    await api.functional.ecommerceMall.admin.admins.index(adminConnection, {
      body: {
        account_status: "invalid_status" as any,
      } satisfies IEcommerceMallAdmin.IRequest,
    });
  });
  // 14. Test invalid admin_grade filter (should fail)
  await TestValidator.error("invalid admin_grade filter", async () => {
    await api.functional.ecommerceMall.admin.admins.index(adminConnection, {
      body: {
        admin_grade: "invalid_grade" as any,
      } satisfies IEcommerceMallAdmin.IRequest,
    });
  });
}