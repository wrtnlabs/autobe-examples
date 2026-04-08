import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with initial profile
  const initialConnection: api.IConnection = { host: connection.host };
  const initialDisplayName = RandomGenerator.name();
  const initialPhoneNumber = RandomGenerator.mobile();
  const initialAvatarUri = typia.random<string & tags.Format<"uri">>();
  const memberAuth = await authorize_member_join(initialConnection, {
    body: {
      name: initialDisplayName,
      phone_number: initialPhoneNumber,
      avatar_uri: initialAvatarUri,
    },
  });
  typia.assert(memberAuth);
  // Create connection for authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  // Capture initial state
  const initialSummary = memberAuth.member;
  typia.assert(initialSummary);
  const initialUpdatedAt = initialSummary.updated_at;
  // 2. Partial update with display_name only
  const newDisplayName = RandomGenerator.name();
  const firstUpdate = await api.functional.hrmPlatform.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: newDisplayName,
      } satisfies IHrmPlatformMember.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  // Verify only display_name changed
  TestValidator.equals(
    "display_name updated to new value",
    firstUpdate.display_name,
    newDisplayName,
  );
  TestValidator.equals(
    "phone_number unchanged from initial",
    firstUpdate.phone_number,
    initialPhoneNumber,
  );
  TestValidator.equals(
    "avatar_uri unchanged from initial",
    firstUpdate.avatar_uri,
    initialAvatarUri,
  );
  TestValidator.predicate(
    "updated_at changed after display_name update",
    firstUpdate.updated_at !== initialUpdatedAt,
  );
  // Capture state after first update
  const afterFirstUpdate = {
    display_name: firstUpdate.display_name,
    phone_number: firstUpdate.phone_number,
    avatar_uri: firstUpdate.avatar_uri,
    updated_at: firstUpdate.updated_at,
  };
  // 3. Partial update with phone_number only
  const newPhoneNumber = RandomGenerator.mobile();
  const secondUpdate = await api.functional.hrmPlatform.member.profile.update(
    memberConnection,
    {
      body: {
        phone_number: newPhoneNumber,
      } satisfies IHrmPlatformMember.IUpdate,
    },
  );
  typia.assert(secondUpdate);
  // Verify only phone_number changed
  TestValidator.equals(
    "phone_number updated to new value",
    secondUpdate.phone_number,
    newPhoneNumber,
  );
  TestValidator.equals(
    "display_name unchanged from first update",
    secondUpdate.display_name,
    afterFirstUpdate.display_name,
  );
  TestValidator.equals(
    "avatar_uri unchanged from first update",
    secondUpdate.avatar_uri,
    afterFirstUpdate.avatar_uri,
  );
  TestValidator.predicate(
    "updated_at changed after phone_number update",
    secondUpdate.updated_at !== afterFirstUpdate.updated_at,
  );
  // Capture state after second update
  const afterSecondUpdate = {
    display_name: secondUpdate.display_name,
    phone_number: secondUpdate.phone_number,
    avatar_uri: secondUpdate.avatar_uri,
    updated_at: secondUpdate.updated_at,
  };
  // 4. Partial update with avatar_uri only
  const newAvatarUri = typia.random<string & tags.Format<"uri">>() as string & tags.MaxLength<80000> & tags.Format<"uri">;
  const thirdUpdate = await api.functional.hrmPlatform.member.profile.update(
    memberConnection,
    {
      body: {
        avatar_uri: newAvatarUri,
      } satisfies IHrmPlatformMember.IUpdate,
    },
  );
  typia.assert(thirdUpdate);
  // Verify only avatar_uri changed
  TestValidator.equals(
    "avatar_uri updated to new value",
    thirdUpdate.avatar_uri,
    newAvatarUri,
  );
  TestValidator.equals(
    "display_name unchanged from second update",
    thirdUpdate.display_name,
    afterSecondUpdate.display_name,
  );
  TestValidator.equals(
    "phone_number unchanged from second update",
    thirdUpdate.phone_number,
    afterSecondUpdate.phone_number,
  );
  TestValidator.predicate(
    "updated_at changed after avatar_uri update",
    thirdUpdate.updated_at !== afterSecondUpdate.updated_at,
  );
  // 5. Two-field partial update (display_name and phone_number)
  const anotherDisplayName = RandomGenerator.name();
  const anotherPhoneNumber = RandomGenerator.mobile();
  const fourthUpdate = await api.functional.hrmPlatform.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: anotherDisplayName,
        phone_number: anotherPhoneNumber,
      } satisfies IHrmPlatformMember.IUpdate,
    },
  );
  typia.assert(fourthUpdate);
  // Verify both fields changed, avatar_uri unchanged
  TestValidator.equals(
    "display_name updated to new value",
    fourthUpdate.display_name,
    anotherDisplayName,
  );
  TestValidator.equals(
    "phone_number updated to new value",
    fourthUpdate.phone_number,
    anotherPhoneNumber,
  );
  TestValidator.equals(
    "avatar_uri unchanged from third update",
    fourthUpdate.avatar_uri,
    thirdUpdate.avatar_uri,
  );
  // 6. Set avatar_uri to null (clear it)
  const nullAvatarUpdate =
    await api.functional.hrmPlatform.member.profile.update(memberConnection, {
      body: {
        avatar_uri: null,
      } satisfies IHrmPlatformMember.IUpdate,
    });
  typia.assert(nullAvatarUpdate);
  TestValidator.equals(
    "avatar_uri set to null",
    nullAvatarUpdate.avatar_uri,
    null,
  );
  TestValidator.equals(
    "display_name unchanged after null avatar update",
    nullAvatarUpdate.display_name,
    fourthUpdate.display_name,
  );
  TestValidator.equals(
    "phone_number unchanged after null avatar update",
    nullAvatarUpdate.phone_number,
    fourthUpdate.phone_number,
  );
}