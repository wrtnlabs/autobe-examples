import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member using the utility function
  // This creates a member connection with auth token set internally
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // Step 2: Extract the member's ID and username from the join response
  const memberId = authorized.id;
  const username = authorized.username;
  // Step 3: Use an unauthenticated connection to verify the endpoint is public
  // (No Authorization header — simulating a guest request)
  const guestConnection: api.IConnection = { host: connection.host };
  // Step 4: Retrieve the member's public profile using their ID
  const profile = await api.functional.community.members.at(guestConnection, {
    memberId,
  });
  // Step 5: Validate the response structure
  typia.assert(profile);
  // Step 6: Validate that the returned profile matches the registered member
  TestValidator.equals("profile id matches memberId", profile.id, memberId);
  TestValidator.equals(
    "username matches registered username",
    profile.username,
    username,
  );
  // Step 7: New member should have karma_score of 0
  TestValidator.equals("karma_score starts at 0", profile.karma_score, 0);
  // Step 8: Optional profile fields should be null for a newly registered member
  TestValidator.equals("display_name is null", profile.display_name, null);
  TestValidator.equals("bio is null", profile.bio, null);
  TestValidator.equals("avatar_url is null", profile.avatar_url, null);
}
