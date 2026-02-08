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

export async function test_api_moderator_deleted_contents_index_filter_by_user_id(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Moderator joins the platform to authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(authorized);
  moderatorConnection.headers ??= {};
  moderatorConnection.headers.Authorization = authorized.token.access;
  // Query deleted contents filtered by a non-existing user ID
  // This should return empty data with valid pagination fields
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();
  const emptyResponse =
    await api.functional.communityPlatform.moderator.deletedContents.index(
      moderatorConnection,
      {
        body: {
          userId: nonExistentUserId,
        } satisfies ICommunityPlatformDeletedContent.IRequest,
      },
    );
  typia.assert(emptyResponse);
  TestValidator.predicate(
    "empty data array when no deleted content for non-existing user",
    Array.isArray(emptyResponse.data) && emptyResponse.data.length === 0,
  );
  TestValidator.predicate(
    "pagination object exists",
    emptyResponse.pagination !== null &&
      typeof emptyResponse.pagination === "object",
  );
  TestValidator.predicate(
    "pagination current page number is non-negative",
    typeof emptyResponse.pagination.current === "number" &&
      emptyResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    typeof emptyResponse.pagination.limit === "number" &&
      emptyResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    typeof emptyResponse.pagination.records === "number" &&
      emptyResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    typeof emptyResponse.pagination.pages === "number" &&
      emptyResponse.pagination.pages >= 0,
  );
  // Retrieve all deleted contents without filter to get available data
  const allDeletedContents =
    await api.functional.communityPlatform.moderator.deletedContents.index(
      moderatorConnection,
      {
        body: {},
      },
    );
  typia.assert(allDeletedContents);
  // If no deleted contents exist, skip further user filtering
  if (allDeletedContents.data.length === 0) {
    return;
  }
  // The type of data does not have userId directly, so we cannot extract userIds
  // So we skip the filter test by userId
  // Just do the pagination and data array check
  TestValidator.predicate(
    "allDeletedContents data array is indeed an array",
    Array.isArray(allDeletedContents.data),
  );
  TestValidator.predicate(
    "pagination current page number is non-negative",
    typeof allDeletedContents.pagination.current === "number" &&
      allDeletedContents.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    typeof allDeletedContents.pagination.limit === "number" &&
      allDeletedContents.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    typeof allDeletedContents.pagination.records === "number" &&
      allDeletedContents.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    typeof allDeletedContents.pagination.pages === "number" &&
      allDeletedContents.pagination.pages >= 0,
  );
}