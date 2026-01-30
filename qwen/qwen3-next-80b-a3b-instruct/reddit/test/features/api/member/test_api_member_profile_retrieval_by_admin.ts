import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_member_profile_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create a target member account using the join function
  const memberCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityBbsMember.IJoin;
  const memberConnection: api.IConnection = { host: connection.host };
  const createdMember: ICommunityBbsMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: memberCreds });
  typia.assert(createdMember);
  // Step 2: Create an admin account and authenticate
  const adminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityBbsAdmin.IJoin;
  const adminConnection: api.IConnection = { host: connection.host };
  const authenticatedAdmin: ICommunityBbsAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, { body: adminCreds });
  typia.assert(authenticatedAdmin);
  // Step 3: Use the admin connection to retrieve the member's profile by ID
  // The adminConnection now has the auth headers from authorize_admin_join
  const retrievedMember: ICommunityBbsMember =
    await api.functional.communityBbs.member.members.at(adminConnection, {
      memberId: createdMember.id,
    });
  typia.assert(retrievedMember);
  // Step 4: Validate that the retrieved profile uses the correct schema
  // Verify all fields from ICommunityBbsMember are present and correct
  TestValidator.equals(
    "member ID matches",
    retrievedMember.id,
    createdMember.id,
  );
  TestValidator.equals(
    "member email matches",
    retrievedMember.email,
    createdMember.email,
  );
  TestValidator.equals(
    "member displayName matches",
    retrievedMember.display_name,
    createdMember.display_name,
  );
  TestValidator.equals(
    "member bio matches",
    retrievedMember.bio,
    createdMember.bio,
  );
  TestValidator.equals(
    "member status matches",
    retrievedMember.status,
    createdMember.status,
  );
  TestValidator.predicate(
    "karma score is a non-negative int32",
    retrievedMember.karma_score >= 0,
  );
  TestValidator.predicate(
    "member duration days is a non-negative int32",
    retrievedMember.member_duration_days >= 0,
  );
  TestValidator.predicate(
    "recent activity score is a non-negative int32",
    retrievedMember.recent_activity_score >= 0,
  );
}
