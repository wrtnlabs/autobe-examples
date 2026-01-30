import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import type { ICommunityBbsUserStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserStatus";
import { prepare_random_community_bbs_user_status } from "../../../prepare/prepare_random_community_bbs_user_status";
import { generate_random_community_bbs_moderator_users_status_create } from "../../../generate/generate_random_community_bbs_moderator_users_status_create";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_user_status_reset_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a connection for moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate moderator by joining
  const moderator: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(32),
      } satisfies ICommunityBbsModerator.IJoin,
    });
  typia.assert(moderator);
  // Step 3: Create a user status record for the moderator's user account
  // The user_id to use is moderator.user_id
  const userStatus: ICommunityBbsUserStatus =
    await generate_random_community_bbs_moderator_users_status_create(
      moderatorConnection,
      {
        body: {
          status: "suspended", // Use one of the allowed values from the enum
        } satisfies ICommunityBbsUserStatus.ICreate,
      },
    );
  typia.assert(userStatus);
  // Step 4: Reset the user's status via DELETE operation
  // The erase operation resets the status of the user identified by the moderator's JWT token (moderator.user_id)
  // Since we are using the same connection that authenticated the moderator, it will reset the status for moderator.user_id
  await api.functional.communityBbs.moderator.users.status.erase(
    moderatorConnection,
  );
  // Step 5: Since the erase operation returns void and 204 No Content, and there is no reported way to verify the reset state
  // (no GET endpoint for status is provided), we rely on successful execution without error as validation.
  // We assume the server correctly nullifies the status.
  // We have already validated the setup: moderator login and status creation.
}
