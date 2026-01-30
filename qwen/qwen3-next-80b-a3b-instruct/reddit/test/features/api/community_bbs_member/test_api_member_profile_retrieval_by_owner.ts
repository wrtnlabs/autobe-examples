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
export async function test_api_member_profile_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new connection and authenticate member via join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberProfile: ICommunityBbsMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    });
  typia.assert(memberProfile);
  // Step 2: Extract member ID from authorized profile
  const memberId: string = memberProfile.id;
  // Step 3: Create new connection for profile retrieval (using same auth)
  const profileConnection: api.IConnection = { host: connection.host };
  // The authorization token is already set in memberConnection headers from authorize_member_join
  // Transfer the headers to profileConnection for authenticated access
  profileConnection.headers = memberConnection.headers;
  // Step 4: Retrieve member profile using the member's ID
  const retrievedProfile: ICommunityBbsMember =
    await api.functional.communityBbs.member.members.at(profileConnection, {
      memberId: memberId,
    });
  typia.assert(retrievedProfile);
  // Step 5: Validate all expected fields are present in the profile
  // Confirm sensitive authentication data (token) is excluded
  TestValidator.equals("member ID matches", retrievedProfile.id, memberId);
  TestValidator.equals(
    "email matches",
    retrievedProfile.email,
    memberProfile.email,
  );
  TestValidator.equals(
    "display_name matches",
    retrievedProfile.display_name,
    memberProfile.display_name,
  );
  TestValidator.equals("bio matches", retrievedProfile.bio, memberProfile.bio);
  TestValidator.equals(
    "status matches",
    retrievedProfile.status,
    memberProfile.status,
  );
  TestValidator.equals(
    "karma_score matches",
    retrievedProfile.karma_score,
    memberProfile.karma_score,
  );
  TestValidator.equals(
    "account_verified matches",
    retrievedProfile.account_verified,
    memberProfile.account_verified,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedProfile.created_at,
    memberProfile.created_at,
  );
  TestValidator.equals(
    "member_duration_days matches",
    retrievedProfile.member_duration_days,
    memberProfile.member_duration_days,
  );
  TestValidator.equals(
    "recent_activity_score matches",
    retrievedProfile.recent_activity_score,
    memberProfile.recent_activity_score,
  );
  // Ensure token property is not present in returned profile
  // (token is in IAuthorized but NOT in ICommunityBbsMember)
  TestValidator.predicate(
    "authentication token should be excluded from response",
    () => {
      return !("token" in retrievedProfile);
    },
  );
}
