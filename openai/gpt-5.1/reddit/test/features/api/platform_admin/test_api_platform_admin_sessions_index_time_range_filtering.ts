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

export async function test_api_platform_admin_sessions_index_time_range_filtering(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin to ensure we have a real admin id
  const joinInput = typia.random<ICommunityPlatformPlatformadmin.IJoin>();
  const authorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinInput,
    });
  typia.assert(authorized);

  const platformAdminId = authorized.id;

  // 2. Ensure at least one platform setting exists so the platform is configured
  const settingCreateBody =
    typia.random<ICommunityPlatformPlatformSetting.ICreate>();
  const setting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: settingCreateBody,
      },
    );
  typia.assert(setting);

  // 3. First, fetch sessions without time filters to capture an existing session
  const initialRequestBody = {
    page: 1,
    limit: 20,
  } satisfies ICommunityPlatformPlatformadminSession.IRequest;

  const initialPage: IPageICommunityPlatformPlatformadminSession.ISummary =
    await api.functional.communityPlatform.platformAdmin.platformAdmins.sessions.index(
      connection,
      {
        platformAdminId,
        body: initialRequestBody,
      },
    );
  typia.assert(initialPage);

  const { data, pagination } = initialPage;

  TestValidator.predicate(
    "platform admin sessions index should return a page object",
    data !== undefined && pagination !== undefined,
  );

  TestValidator.predicate(
    "platform admin sessions index should have at least one session for joined admin",
    data.length >= 1,
  );

  const baseSession: ICommunityPlatformPlatformadminSession.ISummary = data[0];
  typia.assert(baseSession);

  const baseCreatedAt = baseSession.created_at;

  // 4. Derive a tight time window around baseCreatedAt
  const baseDate = new Date(baseCreatedAt);
  const beforeDate = new Date(baseDate.getTime() - 60 * 1000); // 1 minute before
  const afterDate = new Date(baseDate.getTime() + 60 * 1000); // 1 minute after

  const fromIso = beforeDate.toISOString();
  const toIso = afterDate.toISOString();

  const windowRequestBody = {
    page: 1,
    limit: 20,
    created_at_from: fromIso,
    created_at_to: toIso,
  } satisfies ICommunityPlatformPlatformadminSession.IRequest;

  const windowPage: IPageICommunityPlatformPlatformadminSession.ISummary =
    await api.functional.communityPlatform.platformAdmin.platformAdmins.sessions.index(
      connection,
      {
        platformAdminId,
        body: windowRequestBody,
      },
    );
  typia.assert(windowPage);

  TestValidator.predicate(
    "filtered sessions index should respect created_at time window",
    windowPage.data.every((session) => {
      const created = new Date(session.created_at).toISOString();
      return created >= fromIso && created <= toIso;
    }),
  );

  // 7. Non-overlapping time window: far in the past relative to baseCreatedAt
  const pastEndDate = new Date(baseDate.getTime() - 2 * 60 * 60 * 1000); // 2 hours before
  const pastStartDate = new Date(baseDate.getTime() - 3 * 60 * 60 * 1000); // 3 hours before

  const pastFromIso = pastStartDate.toISOString();
  const pastToIso = pastEndDate.toISOString();

  const pastRequestBody = {
    page: 1,
    limit: 20,
    created_at_from: pastFromIso,
    created_at_to: pastToIso,
  } satisfies ICommunityPlatformPlatformadminSession.IRequest;

  const pastPage: IPageICommunityPlatformPlatformadminSession.ISummary =
    await api.functional.communityPlatform.platformAdmin.platformAdmins.sessions.index(
      connection,
      {
        platformAdminId,
        body: pastRequestBody,
      },
    );
  typia.assert(pastPage);

  TestValidator.predicate(
    "non-overlapping past window should return no sessions or all sessions within that window",
    pastPage.data.length === 0 ||
      pastPage.data.every((session) => {
        const created = new Date(session.created_at).toISOString();
        return created >= pastFromIso && created <= pastToIso;
      }),
  );
}
