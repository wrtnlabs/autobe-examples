import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportedContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_reported_contents_authorization_failure(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that access to the reported contents list is protected and
  // only available to moderators with valid authorization.
  // 1. Attempt to access the endpoint without any Authorization header
  await TestValidator.httpError(
    "unauthorized access without token",
    401,
    async () => {
      await api.functional.communityPlatform.moderator.reportedContents.index(
        { host: connection.host },
        {
          body: {},
        },
      );
    },
  );
  // 2. Attempt access with invalid token or incorrect authorization header
  const invalidConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: "Bearer invalid.token.here" },
  };
  await TestValidator.httpError(
    "unauthorized access with invalid token",
    401,
    async () => {
      await api.functional.communityPlatform.moderator.reportedContents.index(
        invalidConnection,
        {
          body: {},
        },
      );
    },
  );
  // 3. Attempt access with valid token but non-moderator authorization (simulate by joining a moderator but removing auth header)
  // Since we cannot use non-moderator token due to lack of other roles,
  // this step is omitted as impossible with current scenario APIs.
}
