import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsUserModerationSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserModerationSummary";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_user_moderation_summary_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as an admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Generate a random user for moderation
  // We cannot generate users directly since no generation function is provided
  // Instead, we must use a real user ID we can retrieve after creating one
  // Since no user creation endpoint is available, we must use the admin's own ID
  // for the test as the target user since we need a user ID to query
  const targetUserId = admin.id; // Use admin's own ID as the target user for moderation summary
  // Step 3: Retrieve the moderation summary for the target user
  const moderationSummary: ICommunityBbsUserModerationSummary =
    await api.functional.communityBbs.admin.users.moderation_summary.at(
      adminConnection,
      {
        userId: targetUserId,
      },
    );
  typia.assert(moderationSummary);
  // Step 4: Validate the response structure contains the required properties
  // Since ICommunityBbsUserModerationSummary is an empty object by definition,
  // the typia.assert() call above ensures the response matches the schema
  // We cannot verify specific array content because the schema provides no structure
  // This test validates that the endpoint is accessible and returns a valid structure
  // This is the maximum possible verification given the schema limitations
}
