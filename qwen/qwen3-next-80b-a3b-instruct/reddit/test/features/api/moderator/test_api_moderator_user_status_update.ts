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
export async function test_api_moderator_user_status_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an actor-specific connection for the moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate moderator using the utility function for POST /communityBbs/auth/moderator/join
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies ICommunityBbsModerator.IJoin;
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: moderatorData,
  });
  typia.assert(moderator);
  // Step 3: Create user status update request using ICommunityBbsUserStatus.ICreate
  const statusUpdate = {
    status: "active",
  } satisfies ICommunityBbsUserStatus.ICreate;
  // Step 4: Update the status using the generate_random_community_bbs_moderator_users_status_create utility function
  const updatedStatus =
    await generate_random_community_bbs_moderator_users_status_create(
      moderatorConnection,
      { body: statusUpdate },
    );
  typia.assert(updatedStatus);
  // Step 5: Validate the returned status object
  // Ensure the status is correctly updated to 'active'
  TestValidator.equals(
    "status updated to active",
    updatedStatus.status,
    "active",
  );
  // Ensure actor_type is 'moderator' as this update was done by a moderator
  TestValidator.equals(
    "actor_type is moderator",
    updatedStatus.actor_type,
    "moderator",
  );
  // Ensure actor_id corresponds to the moderator's ID
  TestValidator.equals(
    "actor_id matches moderator ID",
    updatedStatus.actor_id,
    moderator.id,
  );
  // Ensure performed_by matches the moderator's user_id
  TestValidator.equals(
    "performed_by matches moderator user_id",
    updatedStatus.performed_by,
    moderator.user_id,
  );
  // Verify created_at and updated_at are valid date-time format
  // This is inherently validated by typia.assert()
}