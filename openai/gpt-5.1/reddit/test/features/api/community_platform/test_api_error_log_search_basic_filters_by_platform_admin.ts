import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformErrorLog";
import type { ICommunityPlatformPlatformSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformSetting";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformErrorLog";

export async function test_api_error_log_search_basic_filters_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin (join) to obtain an authenticated context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register" as string &
      tags.Format<"uri">,
    referrer: "https://admin.console.example.com/" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);
  typia.assert<ICommunityPlatformAccountStatus.ISummary>(admin.accountStatus);

  // 2. Create a baseline platform setting so configuration exists
  const settingBody = {
    key: `error-log-test-${RandomGenerator.alphaNumeric(8)}`,
    value: "enabled",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_active: true,
  } satisfies ICommunityPlatformPlatformSetting.ICreate;

  const setting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: settingBody,
      },
    );
  typia.assert<ICommunityPlatformPlatformSetting>(setting);
  TestValidator.equals(
    "created platform setting key should match request",
    setting.key,
    settingBody.key,
  );

  // 3. Build a primary time window around now for searching error logs
  const now = new Date();
  const fromDate = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
  const toDate = new Date(now.getTime() + 60 * 1000); // 1 minute in future
  const from_created_at = fromDate.toISOString();
  const to_created_at = toDate.toISOString();

  const severities = ["error", "critical"] as const;
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 20 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const primaryRequest = {
    from_created_at,
    to_created_at,
    error_severities: [...severities],
    source_components: null,
    error_codes: null,
    memberuser_id: null,
    community_id: null,
    request_id: null,
    search: null,
    page,
    limit,
    order_by_created_at_desc: true,
  } satisfies ICommunityPlatformErrorLog.IRequest;

  // 4. Execute primary search
  const firstPage: IPageICommunityPlatformErrorLog.ISummary =
    await api.functional.communityPlatform.platformAdmin.errorLogs.index(
      connection,
      {
        body: primaryRequest,
      },
    );
  typia.assert<IPageICommunityPlatformErrorLog.ISummary>(firstPage);

  const pagination1 = firstPage.pagination;
  typia.assert<IPage.IPagination>(pagination1);

  TestValidator.equals(
    "primary search: current page should be 1",
    pagination1.current,
    1,
  );
  TestValidator.equals(
    "primary search: limit should equal requested limit",
    pagination1.limit,
    limit,
  );
  TestValidator.predicate(
    "primary search: records should be >= data length",
    pagination1.records >= firstPage.data.length,
  );
  TestValidator.predicate(
    "primary search: pages should be >= 0",
    pagination1.pages >= 0,
  );

  // Validate each error log entry respects filters and has required fields
  for (const log of firstPage.data) {
    typia.assert<ICommunityPlatformErrorLog.ISummary>(log);

    const createdAtTime = new Date(log.created_at).getTime();
    const fromTime = fromDate.getTime();
    const toTime = toDate.getTime();

    TestValidator.predicate(
      "log created_at within requested time window",
      createdAtTime >= fromTime && createdAtTime < toTime,
    );

    TestValidator.predicate(
      "log severity is one of requested severities",
      severities.includes(log.severity as (typeof severities)[number]),
    );

    TestValidator.predicate(
      "log service_name should be non-empty",
      log.service_name.length > 0,
    );
    TestValidator.predicate(
      "log message should be non-empty",
      log.message.length > 0,
    );
  }

  // 5. Call the same search again to validate idempotency / non-mutation
  const secondPage: IPageICommunityPlatformErrorLog.ISummary =
    await api.functional.communityPlatform.platformAdmin.errorLogs.index(
      connection,
      {
        body: primaryRequest,
      },
    );
  typia.assert<IPageICommunityPlatformErrorLog.ISummary>(secondPage);
  const pagination2 = secondPage.pagination;
  typia.assert<IPage.IPagination>(pagination2);

  TestValidator.equals(
    "repeat search: records count should be stable",
    pagination2.records,
    pagination1.records,
  );
  TestValidator.equals(
    "repeat search: pages count should be stable",
    pagination2.pages,
    pagination1.pages,
  );
  TestValidator.equals(
    "repeat search: data length should be stable",
    secondPage.data.length,
    firstPage.data.length,
  );

  if (firstPage.data.length > 0 && secondPage.data.length > 0) {
    TestValidator.equals(
      "repeat search: first log id should remain the same",
      secondPage.data[0].id,
      firstPage.data[0].id,
    );
  }

  // 6. Build a request intended to exercise zero-result behavior using a far-past window
  const pastStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const pastEnd = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000); // 29 days ago

  const zeroRequest = {
    from_created_at: pastStart.toISOString(),
    to_created_at: pastEnd.toISOString(),
    error_severities: [...severities],
    source_components: null,
    error_codes: null,
    memberuser_id: null,
    community_id: null,
    request_id: null,
    search: null,
    page,
    limit,
    order_by_created_at_desc: true,
  } satisfies ICommunityPlatformErrorLog.IRequest;

  const zeroPage: IPageICommunityPlatformErrorLog.ISummary =
    await api.functional.communityPlatform.platformAdmin.errorLogs.index(
      connection,
      {
        body: zeroRequest,
      },
    );
  typia.assert<IPageICommunityPlatformErrorLog.ISummary>(zeroPage);
  const zeroPagination = zeroPage.pagination;
  typia.assert<IPage.IPagination>(zeroPagination);

  // If the backend returns zero records for this far-past window, ensure proper zero-result behavior
  if (zeroPagination.records === 0) {
    TestValidator.equals(
      "zero-result search: data length should be 0 when records is 0",
      zeroPage.data.length,
      0,
    );
    TestValidator.equals(
      "zero-result search: pages should be 0 when records is 0",
      zeroPagination.pages,
      0,
    );
  } else {
    // Otherwise, at least validate structural consistency
    TestValidator.predicate(
      "non-zero far-past search: records should be >= data length",
      zeroPagination.records >= zeroPage.data.length,
    );
  }

  // 7. Repeat far-past search to confirm idempotent behavior
  const zeroPageAgain: IPageICommunityPlatformErrorLog.ISummary =
    await api.functional.communityPlatform.platformAdmin.errorLogs.index(
      connection,
      {
        body: zeroRequest,
      },
    );
  typia.assert<IPageICommunityPlatformErrorLog.ISummary>(zeroPageAgain);
  const zeroPaginationAgain = zeroPageAgain.pagination;
  typia.assert<IPage.IPagination>(zeroPaginationAgain);

  TestValidator.equals(
    "repeat far-past search: records should remain stable",
    zeroPaginationAgain.records,
    zeroPagination.records,
  );
  TestValidator.equals(
    "repeat far-past search: pages should remain stable",
    zeroPaginationAgain.pages,
    zeroPagination.pages,
  );
  TestValidator.equals(
    "repeat far-past search: data length should remain stable",
    zeroPageAgain.data.length,
    zeroPage.data.length,
  );
}
