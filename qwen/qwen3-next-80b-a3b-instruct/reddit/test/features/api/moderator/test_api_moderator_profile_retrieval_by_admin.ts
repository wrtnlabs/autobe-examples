import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_moderator_profile_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a moderator account using join authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
    } satisfies ICommunityBbsModerator.IJoin,
  });
  typia.assert(moderator);
  // Step 2: Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 3: Retrieve the moderator's profile using the admin connection
  const retrievedModerator =
    await api.functional.communityBbs.moderator.moderators.at(adminConnection, {
      moderatorId: moderator.id,
    });
  typia.assert(retrievedModerator);
  // Step 4: Validate only the shared fields between ICommunityBbsModerator.IAuthorized and ICommunityBbsModerator
  // We compare only the base profile fields — ignore token, email, token_type from moderator (IAuthorized)
  TestValidator.equals(
    "moderator ID matches",
    retrievedModerator.id,
    moderator.id,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedModerator.created_at,
    moderator.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedModerator.updated_at,
    moderator.updated_at,
  );
  TestValidator.equals(
    "user_id matches",
    retrievedModerator.user_id,
    moderator.user_id,
  );
  TestValidator.equals(
    "assigned_communities matches",
    retrievedModerator.assigned_communities,
    moderator.assigned_communities,
  );
  TestValidator.equals(
    "permissions_level matches",
    retrievedModerator.permissions_level,
    moderator.permissions_level,
  );
  TestValidator.equals(
    "status matches",
    retrievedModerator.status,
    moderator.status,
  );
  // Step 5: Verify that non-administrators cannot access moderator profile (negative test)
  // Create another moderator account
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  const unauthorizedModerator = await authorize_moderator_join(
    unauthorizedConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(32),
      } satisfies ICommunityBbsModerator.IJoin,
    },
  );
  typia.assert(unauthorizedModerator);
  // Try to access the first moderator's profile as the unauthorized moderator
  await TestValidator.error(
    "unauthorized moderator cannot retrieve another moderator's profile",
    async () => {
      await api.functional.communityBbs.moderator.moderators.at(
        unauthorizedConnection, // Use unauthorized moderator's connection
        {
          moderatorId: moderator.id,
        },
      );
    },
  );
}
