import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import type { IHrmTimeTrackingUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_reflect_global_updates(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const join = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(join);
  const originalProfile =
    await api.functional.hrmTimeTracking.member.profile.at(memberConnection);
  typia.assert(originalProfile);
  const updatedDisplayName = RandomGenerator.name(3);
  const updatedAvatarImageUrl = `https://example.com/${RandomGenerator.alphaNumeric(12)}.png`;
  const updatedPhoneNumber = RandomGenerator.mobile();
  const updatedProfile =
    await api.functional.hrmTimeTracking.member.profile.update(
      memberConnection,
      {
        body: {
          displayName: updatedDisplayName,
          avatarImageUrl: updatedAvatarImageUrl,
          phoneNumber: updatedPhoneNumber,
        } satisfies IHrmTimeTrackingUserProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  TestValidator.equals(
    "display name should reflect latest global profile update",
    updatedProfile.displayName,
    updatedDisplayName,
  );
  TestValidator.equals(
    "avatar image url should reflect latest global profile update",
    updatedProfile.avatarImageUrl,
    updatedAvatarImageUrl as unknown as null | undefined,
  );
  TestValidator.equals(
    "phone number should reflect latest global profile update",
    updatedProfile.phoneNumber,
    updatedPhoneNumber,
  );
  const reloadedProfile =
    await api.functional.hrmTimeTracking.member.profile.at(memberConnection);
  typia.assert(reloadedProfile);
  TestValidator.equals(
    "subsequent reads should return the persisted display name",
    reloadedProfile.displayName,
    updatedDisplayName,
  );
  TestValidator.equals(
    "subsequent reads should return the persisted avatar image url",
    reloadedProfile.avatarImageUrl,
    updatedAvatarImageUrl as unknown as null | undefined,
  );
  TestValidator.equals(
    "subsequent reads should return the persisted phone number",
    reloadedProfile.phoneNumber,
    updatedPhoneNumber,
  );
  TestValidator.equals(
    "reloaded profile should remain consistent with immediate update response",
    reloadedProfile,
    updatedProfile,
  );
  TestValidator.equals(
    "initial profile reads should remain a valid profile snapshot",
    originalProfile.userAccount,
    reloadedProfile.userAccount,
  );
}
