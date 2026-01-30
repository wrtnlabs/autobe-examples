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
export async function test_api_member_profile_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and authenticate
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
  // Step 2: Extract original member properties that should remain unchanged
  const originalId = member.id;
  const originalEmail = member.email;
  const originalCreatedAt = member.created_at;
  // Step 3: Define update payload with permitted fields
  const updateData = {
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    notification_prefs: '{"email": true, "push": false, "frequency": "daily"}',
    status: "disabled",
  } satisfies ICommunityBbsMember.IUpdate;
  // Step 4: Perform profile update
  const updatedMember: ICommunityBbsMember =
    await api.functional.communityBbs.member.members.update(memberConnection, {
      memberId: member.id,
      body: updateData,
    });
  typia.assert(updatedMember);
  // Step 5: Validate that system-generated fields remain unchanged
  TestValidator.equals("member ID preserved", updatedMember.id, originalId);
  TestValidator.equals("email preserved", updatedMember.email, originalEmail);
  TestValidator.equals(
    "created_at preserved",
    updatedMember.created_at,
    originalCreatedAt,
  );
  // Step 6: Validate updated fields reflect new values
  TestValidator.equals(
    "display_name updated",
    updatedMember.display_name,
    updateData.display_name,
  );
  TestValidator.equals("bio updated", updatedMember.bio, updateData.bio);
  // Removed notification_prefs validation: server response does not include this field
  TestValidator.equals(
    "status updated",
    updatedMember.status,
    updateData.status,
  );
  // Step 7: Validate non-updatable fields remain unchanged
  TestValidator.equals(
    "karma_score unchanged",
    updatedMember.karma_score,
    member.karma_score,
  );
  TestValidator.equals(
    "account_verified unchanged",
    updatedMember.account_verified,
    member.account_verified,
  );
  TestValidator.equals(
    "member_duration_days unchanged",
    updatedMember.member_duration_days,
    member.member_duration_days,
  );
  TestValidator.equals(
    "recent_activity_score unchanged",
    updatedMember.recent_activity_score,
    member.recent_activity_score,
  );
}