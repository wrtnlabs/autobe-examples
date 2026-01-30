import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import type { ICommunityBbsUserStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserStatus";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_user_status_update_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member user account for testing
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(member);
  // Step 2: Create a moderator account with a known password hash
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorPasswordHash =
    "$2a$10$bAAj.SCmYH58Cf38t8W37O9YQbP7jYXL2O7.pC1btodyXvGQ3dW7K"; // BCrypt hash for "moderator123"
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: moderatorPasswordHash,
    },
  });
  typia.assert(moderator);
  // Step 3: Authenticate as the moderator to get used for updates
  const authenticatedModeratorConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_moderator_login(authenticatedModeratorConnection, {
    body: {
      email: moderator.email,
      password_hash: moderatorPasswordHash, // Use the same password_hash used during join
    },
  });
  // Step 4: Update member status from active to suspended with a reason
  const updatedStatus =
    await api.functional.communityBbs.moderator.users.status.update(
      authenticatedModeratorConnection,
      {
        userId: member.id,
        body: {
          reason: "Violation of community guidelines",
        } satisfies ICommunityBbsUserStatus.IUpdate,
      },
    );
  typia.assert(updatedStatus);
  // Step 5: Validate the updated status record
  TestValidator.equals(
    "status should be suspended",
    updatedStatus.status,
    "suspended",
  );
  TestValidator.equals(
    "reason should match",
    updatedStatus.reason,
    "Violation of community guidelines",
  );
  TestValidator.equals(
    "actor_type should be moderator",
    updatedStatus.actor_type,
    "moderator",
  );
  TestValidator.equals(
    "actor_id should match moderator id",
    updatedStatus.actor_id,
    moderator.id,
  );
  TestValidator.equals(
    "performed_by should match moderator id",
    updatedStatus.performed_by,
    moderator.id,
  );
  TestValidator.equals(
    "user_id should match member id",
    updatedStatus.user_id,
    member.id,
  );
}
