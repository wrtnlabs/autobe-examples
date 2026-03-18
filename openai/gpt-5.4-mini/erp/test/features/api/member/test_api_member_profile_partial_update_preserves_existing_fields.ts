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

export async function test_api_member_profile_partial_update_preserves_existing_fields(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const uniqueEmail = `${RandomGenerator.alphabets(10)}@example.com`;
  const password = RandomGenerator.alphaNumeric(16);
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: uniqueEmail,
      password,
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const initialDisplayName = RandomGenerator.name();
  const initialPhoneNumber = RandomGenerator.mobile();
  const initialProfile =
    await api.functional.hrmTimeTracking.member.profile.update(
      memberConnection,
      {
        body: {
          displayName: initialDisplayName,
          phoneNumber: initialPhoneNumber,
        } satisfies IHrmTimeTrackingUserProfile.IUpdate,
      },
    );
  typia.assert(initialProfile);
  const nextDisplayName = RandomGenerator.name();
  const updatedProfile =
    await api.functional.hrmTimeTracking.member.profile.update(
      memberConnection,
      {
        body: {
          displayName: nextDisplayName,
        } satisfies IHrmTimeTrackingUserProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  TestValidator.equals(
    "display name should update",
    updatedProfile.displayName,
    nextDisplayName,
  );
  TestValidator.equals(
    "avatar image should be preserved",
    updatedProfile.avatarImageUrl,
    initialProfile.avatarImageUrl,
  );
  TestValidator.equals(
    "phone number should be preserved",
    updatedProfile.phoneNumber,
    initialProfile.phoneNumber,
  );
  TestValidator.equals(
    "profile id should remain stable",
    updatedProfile.id,
    initialProfile.id,
  );
  TestValidator.equals(
    "owning account should remain stable",
    updatedProfile.userAccount,
    initialProfile.userAccount,
  );
  TestValidator.equals(
    "created timestamp should remain stable",
    updatedProfile.createdAt,
    initialProfile.createdAt,
  );
  TestValidator.notEquals(
    "updated timestamp should change after modification",
    updatedProfile.updatedAt,
    initialProfile.updatedAt,
  );
  TestValidator.equals(
    "deleted timestamp should remain stable",
    updatedProfile.deletedAt,
    initialProfile.deletedAt,
  );
}
