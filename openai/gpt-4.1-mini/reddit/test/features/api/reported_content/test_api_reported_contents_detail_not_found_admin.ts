import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieval of a reported content link by admin with a non-existing ID.
 * Authenticates as admin, attempts to retrieve by a UUID that does not exist,
 * expects a 404 Not Found error, and verifies the error message.
 */
export async function test_api_reported_contents_detail_not_found_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: undefined,
  });
  typia.assert(admin);
  // 2. Attempt to get a reported content with a random non-existing UUID
  const nonExistingId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect HttpError with 404 status code on attempt
  await TestValidator.httpError(
    "reported content detail not found returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.admin.reportedContents.at(
        adminConnection,
        { id: nonExistingId },
      );
    },
  );
}
