import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderator_registration(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an isolated connection for moderator registration
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Step 2: Generate valid test data for moderator registration
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  // Step 3: Use the utility function to register moderator (mandatory per system rules)
  const moderatorRegistration = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies ICommunityPlatformModerator.IJoin,
    },
  );
  // Step 4: Validate the response structure
  typia.assert<ICommunityPlatformModerator.IAuthorized>(moderatorRegistration);
  // Step 5: Validate user property (ISummary is empty object)
  TestValidator.equals("user property exists", moderatorRegistration.user, {});
  // Step 6: Validate community property (ISummary has expected properties)
  TestValidator.predicate(
    "community has correct name",
    moderatorRegistration.community.name.length > 0,
  );
  TestValidator.predicate(
    "community has description",
    moderatorRegistration.community.description.length > 0 &&
      moderatorRegistration.community.description.length <= 1000,
  );
  TestValidator.predicate(
    "community has valid URI icon",
    typia.is<string & tags.Format<"uri">>(moderatorRegistration.community.icon),
  );
  TestValidator.predicate(
    "community has non-negative subscriber count",
    moderatorRegistration.community.subscriber_count >= 0,
  );
  TestValidator.predicate(
    "community has valid date-time created_at",
    typia.is<string & tags.Format<"date-time">>(
      moderatorRegistration.community.created_at,
    ),
  );
  // Step 7: Validate moderator id is a valid UUID
  TestValidator.predicate(
    "moderator id is valid UUID",
    typia.is<string & tags.Format<"uuid">>(moderatorRegistration.id),
  );
  // Step 8: Validate token structure (correct ICommunityPlatformAuthorizationToken)
  TestValidator.equals(
    "access token exists",
    typeof moderatorRegistration.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token exists",
    typeof moderatorRegistration.token.refresh,
    "string",
  );
  TestValidator.predicate(
    "access token is non-empty",
    moderatorRegistration.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    moderatorRegistration.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    typia.is<string & tags.Format<"date-time">>(
      moderatorRegistration.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    typia.is<string & tags.Format<"date-time">>(
      moderatorRegistration.token.refreshable_until,
    ),
  );
  // Step 9: Test duplicate email rejection - create another user with same email
  const duplicateEmailConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate email should return 409 conflict",
    async () => {
      await authorize_moderator_join(duplicateEmailConnection, {
        body: {
          email: moderatorEmail, // same email as before
          password: RandomGenerator.alphaNumeric(16),
        } satisfies ICommunityPlatformModerator.IJoin,
      });
    },
  );
  // Step 10: Test password minimum length validation
  const shortPasswordConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "password shorter than 8 chars should reject",
    async () => {
      await authorize_moderator_join(shortPasswordConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "1234567", // 7 chars - below minimum
        } satisfies ICommunityPlatformModerator.IJoin,
      });
    },
  );
}
