import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_reported_content_detail_access_denied_unauthenticated(
  connection: api.IConnection,
): Promise<void> {
  // Description:
  // This test attempts to retrieve a reported content detail by ID without
  // providing any authentication token or authorization headers.
  // We expect the API to deny access with an HTTP 403 Forbidden error.
  const baseConnection: api.IConnection = { host: connection.host };
  // Random valid UUID for requested reported content ID
  const reportedContentId = typia.random<string & tags.Format<"uuid">>();
  // Perform the call without authentication and expect 403 error
  await TestValidator.httpError(
    "access denied unauthenticated for reported content detail",
    403,
    async () =>
      await api.functional.communityPlatform.moderator.reportedContents.at(
        baseConnection,
        { id: reportedContentId },
      ),
  );
}
