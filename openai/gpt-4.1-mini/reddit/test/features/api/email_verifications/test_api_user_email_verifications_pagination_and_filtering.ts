import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_email_verifications_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Scenario description:
  // Test retrieving a paginated list of email verification records for an authenticated user using valid filtering and pagination.
  // 1. Create a user and authorize (join) to get tokens
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  // Inject user's access token into connection headers
  userConnection.headers = {
    Authorization: `Bearer ${authorizedUser.token.access}`,
  };
  // 2. Prepare a filtering request with pagination params for email verifications belonging to this user
  const requestBody: ICommunityPlatformUserEmailVerification.IRequest = {
    userId: authorizedUser.id,
    page: 1,
    limit: 10,
    // No other filters for this test, but could add isVerified: true for variation
  };
  // 3. Call the email_verifications index API with the userConnection
  const response =
    await api.functional.communityPlatform.user.email_verifications.index(
      userConnection,
      { body: requestBody },
    );
  // 4. Assert the response type fully validates
  typia.assert(response);
  // 5. Check pagination metadata is correct
  TestValidator.predicate(
    "pagination current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    response.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages is correctly calculated",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit) ||
      response.pagination.pages === 0,
  );
  // 6. Validate response data array and elements
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  // For each email verification summary
  for (const record of response.data) {
    // Assert typia structure
    typia.assert(record);
    // Should belong to the authorized user
    TestValidator.equals(
      "each record user id matches logged in user",
      record.user.id,
      authorizedUser.id,
    );
    // Token string should be non-empty
    TestValidator.predicate(
      "token string is non-empty",
      typeof record.token === "string" && record.token.length > 0,
    );
    // isVerified is boolean
    TestValidator.predicate(
      "isVerified is boolean",
      typeof record.isVerified === "boolean",
    );
    // Timestamps must be strings with date-time format
    TestValidator.predicate(
      "expiresAt is valid format string",
      typeof record.expiresAt === "string",
    );
    TestValidator.predicate(
      "createdAt is valid format string",
      typeof record.createdAt === "string",
    );
    TestValidator.predicate(
      "updatedAt is valid format string",
      typeof record.updatedAt === "string",
    );
    // deletedAt can be null or string
    TestValidator.predicate(
      "deletedAt is null or string",
      record.deletedAt === null || typeof record.deletedAt === "string",
    );
  }
  // 7. Authorization check: access with another user should fail
  const otherUserConnection: api.IConnection = { host: connection.host };
  const otherUser = await authorize_user_join(otherUserConnection, {});
  otherUserConnection.headers = {
    Authorization: `Bearer ${otherUser.token.access}`,
  };
  // Should not see records of first user
  const otherUserRequestBody: ICommunityPlatformUserEmailVerification.IRequest =
    {
      userId: authorizedUser.id,
      page: 1,
      limit: 5,
    };
  await TestValidator.error(
    "unauthorized access to other user's email verifications",
    async () => {
      await api.functional.communityPlatform.user.email_verifications.index(
        otherUserConnection,
        { body: otherUserRequestBody },
      );
    },
  );
}
