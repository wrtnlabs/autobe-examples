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

export async function test_api_member_profile_update_shared_identity(
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
  const initialUpdate = {
    displayName: RandomGenerator.name(),
    avatarImageUrl: null,
    phoneNumber: RandomGenerator.mobile(),
  } satisfies IHrmTimeTrackingUserProfile.IUpdate;
  const updatedProfile =
    await api.functional.hrmTimeTracking.member.profile.update(
      memberConnection,
      { body: initialUpdate },
    );
  typia.assert(updatedProfile);
  TestValidator.equals(
    "profile display name is updated",
    updatedProfile.displayName,
    initialUpdate.displayName,
  );
  TestValidator.equals(
    "profile avatar url is cleared",
    updatedProfile.avatarImageUrl,
    null,
  );
  TestValidator.equals(
    "profile phone number is updated",
    updatedProfile.phoneNumber,
    initialUpdate.phoneNumber,
  );
  TestValidator.predicate(
    "profile id is present",
    updatedProfile.id.length > 0,
  );
  TestValidator.predicate(
    "profile timestamps are present",
    updatedProfile.createdAt.length > 0 && updatedProfile.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "user account summary exists",
    updatedProfile.userAccount !== null &&
      updatedProfile.userAccount !== undefined,
  );
  TestValidator.predicate(
    "profile remains active",
    updatedProfile.deletedAt === null,
  );
  const partialUpdate = {
    displayName: `${initialUpdate.displayName} ${RandomGenerator.alphabets(4)}`,
  } satisfies IHrmTimeTrackingUserProfile.IUpdate;
  const partiallyUpdatedProfile =
    await api.functional.hrmTimeTracking.member.profile.update(
      memberConnection,
      { body: partialUpdate },
    );
  typia.assert(partiallyUpdatedProfile);
  TestValidator.equals(
    "profile id remains stable across updates",
    partiallyUpdatedProfile.id,
    updatedProfile.id,
  );
  TestValidator.equals(
    "display name changes on partial update",
    partiallyUpdatedProfile.displayName,
    partialUpdate.displayName,
  );
  TestValidator.equals(
    "avatar url is preserved when omitted",
    partiallyUpdatedProfile.avatarImageUrl,
    updatedProfile.avatarImageUrl,
  );
  TestValidator.equals(
    "phone number is preserved when omitted",
    partiallyUpdatedProfile.phoneNumber,
    updatedProfile.phoneNumber,
  );
  TestValidator.predicate(
    "user account summary remains present",
    partiallyUpdatedProfile.userAccount !== null &&
      partiallyUpdatedProfile.userAccount !== undefined,
  );
  TestValidator.predicate(
    "profile remains active after partial update",
    partiallyUpdatedProfile.deletedAt === null,
  );
}
