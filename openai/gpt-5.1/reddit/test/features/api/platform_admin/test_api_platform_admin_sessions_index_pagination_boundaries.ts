import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPlatformadminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadminSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPlatformadminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPlatformadminSession";

export async function test_api_platform_admin_sessions_index_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin and obtain an authenticated context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const authorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(authorized);

  const platformAdminId: string & tags.Format<"uuid"> = authorized.id;

  // 2. Create at least one baseline platform setting as a prerequisite
  const settingBody = {
    key: `test.pagination.${RandomGenerator.alphaNumeric(8)}`,
    value: "1",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const platformSetting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: settingBody,
      },
    );
  typia.assert<ICommunityPlatformPlatformSetting>(platformSetting);

  // 3.a Call sessions index with page=1, limit=1
  const firstPageRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ICommunityPlatformPlatformadminSession.IRequest;

  const page1: IPageICommunityPlatformPlatformadminSession.ISummary =
    await api.functional.communityPlatform.platformAdmin.platformAdmins.sessions.index(
      connection,
      {
        platformAdminId,
        body: firstPageRequest,
      },
    );
  typia.assert<IPageICommunityPlatformPlatformadminSession.ISummary>(page1);

  const pagination1 = page1.pagination;
  const data1 = page1.data;

  // Validate pagination metadata for page=1, limit=1
  TestValidator.equals(
    "page1 current page should be 1",
    pagination1.current,
    1,
  );
  TestValidator.equals("page1 limit should be 1", pagination1.limit, 1);
  TestValidator.predicate(
    "page1 records should be non-negative",
    pagination1.records >= 0,
  );
  TestValidator.predicate(
    "page1 pages should be non-negative",
    pagination1.pages >= 0,
  );

  // When sessions exist, ensure all belong to the same platform admin
  for (const session of data1) {
    TestValidator.equals(
      "session.platformAdmin.id must match platformAdminId on page1",
      session.platformAdmin.id,
      platformAdminId,
    );
  }

  // 3.b If there is more than one record and at least 2 pages, request page=2
  if (pagination1.records > 1 && pagination1.pages >= 2) {
    const secondPageRequest = {
      page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    } satisfies ICommunityPlatformPlatformadminSession.IRequest;

    const page2: IPageICommunityPlatformPlatformadminSession.ISummary =
      await api.functional.communityPlatform.platformAdmin.platformAdmins.sessions.index(
        connection,
        {
          platformAdminId,
          body: secondPageRequest,
        },
      );
    typia.assert<IPageICommunityPlatformPlatformadminSession.ISummary>(page2);

    const pagination2 = page2.pagination;
    const data2 = page2.data;

    TestValidator.equals(
      "page2 current page should be 2 when requested",
      pagination2.current,
      2,
    );
    TestValidator.equals("page2 limit should be 1", pagination2.limit, 1);

    for (const session of data2) {
      TestValidator.equals(
        "session.platformAdmin.id must match platformAdminId on page2",
        session.platformAdmin.id,
        platformAdminId,
      );
    }

    if (data1.length > 0 && data2.length > 0) {
      TestValidator.notEquals(
        "first session of page1 and page2 should be different when multiple records exist",
        data1[0].id,
        data2[0].id,
      );
    }
  }

  // 3.c Call sessions index with a very high page number to test out-of-range behavior
  const highPageNumber = 9999 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const highPageRequest = {
    page: highPageNumber,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ICommunityPlatformPlatformadminSession.IRequest;

  const highPage: IPageICommunityPlatformPlatformadminSession.ISummary =
    await api.functional.communityPlatform.platformAdmin.platformAdmins.sessions.index(
      connection,
      {
        platformAdminId,
        body: highPageRequest,
      },
    );
  typia.assert<IPageICommunityPlatformPlatformadminSession.ISummary>(highPage);

  const highPagination = highPage.pagination;
  const highData = highPage.data;

  // metadata should be self-consistent and aligned with the first call
  TestValidator.equals(
    "high page limit should equal requested limit",
    highPagination.limit,
    highPageRequest.limit,
  );

  TestValidator.equals(
    "high page records should match first page records",
    highPagination.records,
    pagination1.records,
  );
  TestValidator.equals(
    "high page total pages should match first page pages",
    highPagination.pages,
    pagination1.pages,
  );

  if (pagination1.pages === 0 || pagination1.records === 0) {
    // No records at all: high page must be empty
    TestValidator.equals(
      "when no records, high page data must be empty",
      highData.length,
      0,
    );
  } else if (highPagination.current > highPagination.pages) {
    // Out-of-range page index should result in empty data
    TestValidator.equals(
      "out-of-range high page should return empty data",
      highData.length,
      0,
    );
  } else {
    // Server might clamp to the last page; at least confirm current within bounds
    TestValidator.predicate(
      "high page current must be within available page range",
      highPagination.current >= 1 &&
        highPagination.current <= highPagination.pages,
    );
  }

  for (const session of highData) {
    TestValidator.equals(
      "session.platformAdmin.id must match platformAdminId on high page",
      session.platformAdmin.id,
      platformAdminId,
    );
  }
}
