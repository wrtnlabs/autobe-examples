import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeletedContent";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformDeletedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformDeletedContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_deleted_contents_index_basic_listing(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for moderator and authorize join
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {}, // ICommunityPlatformModerator.IJoin is empty
  });
  typia.assert(moderatorAuth);
  // Step 2: Create new connection for authorized moderator with token
  const authorizedModeratorConnection: api.IConnection = {
    host: connection.host,
  };
  authorizedModeratorConnection.headers = {
    Authorization: `Bearer ${moderatorAuth.token.access}`,
  };
  // Step 3: Call the deleted contents index API with empty filter (no filters)
  const deletedContents =
    await api.functional.communityPlatform.moderator.deletedContents.index(
      authorizedModeratorConnection,
      {
        body: {}, // ICommunityPlatformDeletedContent.IRequest has no properties
      },
    );
  typia.assert(deletedContents);
  // Step 4: Validate pagination info fields
  const pagination = deletedContents.pagination;
  TestValidator.predicate(
    "current page number is at least 1",
    pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit per page is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "total records count is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "total page count is non-negative",
    pagination.pages >= 0,
  );
  // Step 5: Validate presence and basic structure of data array
  TestValidator.predicate(
    "data array is Array",
    Array.isArray(deletedContents.data),
  );
  // Step 6: For each record, validate expected fields exist and are parsed
  for (const record of deletedContents.data) {
    // Since ICommunityPlatformDeletedContent.ISummary has no defined properties,
    // we can only assert the object structure in typia.assert above.
    // But we can validate key moderator, user, reason, timestamps presence and types if needed.
    // No property info given, so skip extra field checks.
  }
  // Step 7: Check unauthorized access - create new connection without auth
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "should throw unauthorized error if no moderator auth",
    401,
    async () => {
      await api.functional.communityPlatform.moderator.deletedContents.index(
        unauthorizedConnection,
        { body: {} },
      );
    },
  );
}
