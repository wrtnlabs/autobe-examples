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

export async function test_api_member_profile_update_does_not_change_organization_data(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joined);
  const baselineProfile =
    await api.functional.hrmTimeTracking.member.profile.update(
      memberConnection,
      {
        body: {
          displayName: RandomGenerator.name(),
          avatarImageUrl: null,
          phoneNumber: RandomGenerator.mobile(),
        } satisfies IHrmTimeTrackingUserProfile.IUpdate,
      },
    );
  typia.assert(baselineProfile);
  const updatedDisplayName = RandomGenerator.name();
  const updatedPhoneNumber = RandomGenerator.mobile();
  const updatedProfile =
    await api.functional.hrmTimeTracking.member.profile.update(
      memberConnection,
      {
        body: {
          displayName: updatedDisplayName,
          avatarImageUrl: null,
          phoneNumber: updatedPhoneNumber,
        } satisfies IHrmTimeTrackingUserProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  TestValidator.equals(
    "profile id should remain the same",
    updatedProfile.id,
    baselineProfile.id,
  );
  TestValidator.equals(
    "profile owner account should remain the same",
    updatedProfile.userAccount,
    baselineProfile.userAccount,
  );
  TestValidator.equals(
    "display name should update",
    updatedProfile.displayName,
    updatedDisplayName,
  );
  TestValidator.equals(
    "avatar image url should remain null",
    updatedProfile.avatarImageUrl,
    null,
  );
  TestValidator.equals(
    "phone number should update",
    updatedProfile.phoneNumber,
    updatedPhoneNumber,
  );
  TestValidator.equals(
    "createdAt should be preserved",
    updatedProfile.createdAt,
    baselineProfile.createdAt,
  );
  TestValidator.equals(
    "deletedAt should remain null",
    updatedProfile.deletedAt,
    null,
  );
}
