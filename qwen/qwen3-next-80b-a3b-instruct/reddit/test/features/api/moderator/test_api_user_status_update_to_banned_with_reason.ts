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
export async function test_api_user_status_update_to_banned_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Create a moderator account with elevated privileges and store password_hash
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorPasswordHash = RandomGenerator.alphaNumeric(32);
  const moderator: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: moderatorPasswordHash,
      } satisfies ICommunityBbsModerator.IJoin,
    });
  typia.assert(moderator);
  // Step 3: Authenticate as moderator to gain permissions
  const authModeratorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(authModeratorConnection, {
    body: {
      email: moderator.email,
      password_hash: moderatorPasswordHash,
    } satisfies ICommunityBbsModerator.ILogin,
  });
  // authModeratorConnection.headers is now updated with moderator token
  // Step 4: Update member's status to 'banned' with a policy violation reason
  const updatedStatus: ICommunityBbsUserStatus =
    await api.functional.communityBbs.moderator.users.status.update(
      authModeratorConnection,
      {
        userId: member.id,
        body: {
          reason:
            "Violation of Community Guidelines Section 8: Posting inappropriate content",
        } satisfies ICommunityBbsUserStatus.IUpdate,
      },
    );
  typia.assert(updatedStatus);
  // Step 5: Validate the response contains correct status, reason, and actor information
  TestValidator.equals(
    "status updated to banned",
    updatedStatus.status,
    "banned",
  );
  TestValidator.equals(
    "reason matches policy violation",
    updatedStatus.reason,
    "Violation of Community Guidelines Section 8: Posting inappropriate content",
  );
  TestValidator.equals(
    "actor_type is moderator",
    updatedStatus.actor_type,
    "moderator",
  );
  typia.assert<string & tags.Format<"uuid">>(updatedStatus.actor_id);
  TestValidator.equals(
    "actor_id matches moderator",
    updatedStatus.actor_id,
    moderator.id,
  );
  typia.assert<string & tags.Format<"uuid">>(updatedStatus.performed_by);
  TestValidator.equals(
    "performed_by matches moderator",
    updatedStatus.performed_by,
    moderator.user_id,
  );
}
