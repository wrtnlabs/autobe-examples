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

export async function test_api_platform_admin_session_get_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and obtain an authenticated connection
  const joinBody = typia.random<ICommunityPlatformPlatformadmin.IJoin>();

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Ensure at least one platform setting exists
  const settingBody = typia.random<ICommunityPlatformPlatformSetting.ICreate>();

  const platformSetting: ICommunityPlatformPlatformSetting =
    await api.functional.communityPlatform.platformAdmin.platformSettings.create(
      connection,
      {
        body: settingBody,
      },
    );
  typia.assert<ICommunityPlatformPlatformSetting>(platformSetting);

  // 3. List sessions for the admin and pick one valid session id
  const sessionsPage: IPageICommunityPlatformPlatformadminSession.ISummary =
    await api.functional.communityPlatform.platformAdmin.platformAdmins.sessions.index(
      connection,
      {
        platformAdminId: admin.id,
        body: {
          // Keep request simple; rely on server defaults for paging
        } satisfies ICommunityPlatformPlatformadminSession.IRequest,
      },
    );
  typia.assert<IPageICommunityPlatformPlatformadminSession.ISummary>(
    sessionsPage,
  );

  TestValidator.predicate(
    "platform admin should have at least one session",
    sessionsPage.data.length > 0,
  );

  const sessionSummary: ICommunityPlatformPlatformadminSession.ISummary =
    sessionsPage.data[0];
  typia.assert<ICommunityPlatformPlatformadminSession.ISummary>(sessionSummary);

  // 4. Build an unauthenticated connection by stripping headers
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // 5. Unauthenticated request should fail
  await TestValidator.error(
    "unauthenticated session detail access must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.platformAdmins.sessions.at(
        unauthConnection,
        {
          platformAdminId: admin.id,
          sessionId: sessionSummary.id,
        },
      );
    },
  );

  // 6. Authenticated request should succeed and return the session details
  const sessionDetail: ICommunityPlatformPlatformadminSession =
    await api.functional.communityPlatform.platformAdmin.platformAdmins.sessions.at(
      connection,
      {
        platformAdminId: admin.id,
        sessionId: sessionSummary.id,
      },
    );
  typia.assert<ICommunityPlatformPlatformadminSession>(sessionDetail);

  TestValidator.equals(
    "session detail owner id must match admin id",
    sessionDetail.community_platform_platformadmin_id,
    admin.id,
  );
}
