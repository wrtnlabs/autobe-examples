import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_profile_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResponse: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 2: Extract the member_id from the authorization response
  const memberId = authResponse.member_id;
  // Step 3: Update member profile using empty request body since IUpdate is {} per schema
  // This is the ONLY valid request body according to ICommunityPlatformMember.IUpdate definition
  const updatedMember: ICommunityPlatformMember =
    await api.functional.communityPlatform.member.members.update(
      memberConnection,
      {
        memberId,
        body: {} satisfies ICommunityPlatformMember.IUpdate,
      },
    );
  // Step 4: Validate the returned member object has all required fields
  typia.assert(updatedMember);
  TestValidator.equals("member_id matches", updatedMember.member_id, memberId);
  TestValidator.equals(
    "username matches",
    updatedMember.username,
    authResponse.username,
  );
  TestValidator.equals(
    "display_name matches",
    updatedMember.display_name,
    authResponse.display_name,
  );
  TestValidator.equals("bio matches", updatedMember.bio, authResponse.bio);
  TestValidator.equals(
    "avatar_url matches",
    updatedMember.avatar_url,
    authResponse.avatar_url,
  );
  TestValidator.equals(
    "karma matches",
    updatedMember.karma,
    authResponse.karma,
  );
  // NOTE: Despite the scenario requiring profile field updates, the IUpdate type is {} which means
  // NO fields can be sent in the request body. The profile fields returned by the API are identical
  // to the authentication response. We cannot test any modification because the backend accepts no data for update.
}
