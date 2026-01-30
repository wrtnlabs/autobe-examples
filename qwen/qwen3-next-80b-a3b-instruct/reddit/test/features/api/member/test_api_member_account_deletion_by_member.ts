import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_account_deletion_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate as member using join operation - this establishes the member's identity and authorization
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityBbsMember.IJoin;
  const authorizedMember: ICommunityBbsMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: memberCredentials,
    });
  // Validate that the returned authorized member object has all required properties
  typia.assert(authorizedMember);
  // Step 2: Call the delete operation using the authenticated connection
  // The delete endpoint requires the memberId from the authorized member's ID
  const deletedMember: ICommunityBbsMember =
    await api.functional.communityBbs.member.members.erase(memberConnection, {
      memberId: authorizedMember.id,
    });
  // Step 3: Validate that the returned object contains all member properties before deletion
  typia.assert(deletedMember);
  // Assert that the deleted member object matches the previously authorized member object
  // We must exclude 'token' property since it exists in authorizedMember but not in deletedMember
  // Use exception filter to ignore the 'token' property during comparison
  TestValidator.equals(
    "deleted member matches authorized member",
    deletedMember,
    authorizedMember,
    (key) => key === "token",
  );
  // Validate important fields individually for clarity
  TestValidator.equals(
    "deleted member email matches",
    deletedMember.email,
    authorizedMember.email,
  );
  TestValidator.equals(
    "deleted member display_name matches",
    deletedMember.display_name,
    authorizedMember.display_name,
  );
  TestValidator.equals(
    "deleted member status matches",
    deletedMember.status,
    authorizedMember.status,
  );
  TestValidator.equals(
    "deleted member karma_score matches",
    deletedMember.karma_score,
    authorizedMember.karma_score,
  );
  TestValidator.equals(
    "deleted member account_verified matches",
    deletedMember.account_verified,
    authorizedMember.account_verified,
  );
  TestValidator.equals(
    "deleted member created_at matches",
    deletedMember.created_at,
    authorizedMember.created_at,
  );
  TestValidator.equals(
    "deleted member member_duration_days matches",
    deletedMember.member_duration_days,
    authorizedMember.member_duration_days,
  );
  TestValidator.equals(
    "deleted member recent_activity_score matches",
    deletedMember.recent_activity_score,
    authorizedMember.recent_activity_score,
  );
  // Validate that the deleted member ID is a valid UUID format
  TestValidator.predicate(
    "deleted member ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      deletedMember.id,
    ),
  );
}
