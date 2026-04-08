import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_shared_global_profile(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234Aa!!",
      displayName: RandomGenerator.name(),
      avatarImageUrl: typia.random<string & tags.Format<"uri">>(),
      phoneNumber: RandomGenerator.mobile(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/referrer",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  const initialDisplayName = joined.displayName;
  const initialAvatarImageUrl = joined.avatarImageUrl;
  const initialPhoneNumber = joined.phoneNumber;
  const initialCreatedAt = joined.createdAt;
  const initialDeletedAt = joined.deletedAt;
  const initialId = joined.id;
  const initialEmail = joined.email;
  const updatedDisplayName = `${RandomGenerator.name()} ${RandomGenerator.alphabets(4)}`;
  const updatedAvatarImageUrl = `https://example.com/avatar/${RandomGenerator.alphaNumeric(8)}.png`;
  const updatedPhoneNumber = RandomGenerator.mobile();
  const updated = await api.functional.erpHrmTime.member.profile.update(
    memberConnection,
    {
      body: {
        displayName: updatedDisplayName,
        avatarImageUrl: updatedAvatarImageUrl,
        phoneNumber: updatedPhoneNumber,
      } satisfies IErpHrmTimeMember.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals("member id should be preserved", updated.id, initialId);
  TestValidator.equals(
    "member email should be preserved",
    updated.email,
    initialEmail,
  );
  TestValidator.equals(
    "member createdAt should be preserved",
    updated.createdAt,
    initialCreatedAt,
  );
  TestValidator.equals(
    "member deletedAt should be preserved",
    updated.deletedAt,
    initialDeletedAt,
  );
  TestValidator.equals(
    "display name should update",
    updated.displayName,
    updatedDisplayName,
  );
  TestValidator.equals(
    "avatar image url should update",
    updated.avatarImageUrl,
    updatedAvatarImageUrl,
  );
  TestValidator.equals(
    "phone number should update",
    updated.phoneNumber,
    updatedPhoneNumber,
  );
  TestValidator.notEquals(
    "updatedAt should change after profile update",
    updated.updatedAt,
    joined.updatedAt,
  );
  const persisted = await api.functional.erpHrmTime.member.profile.update(
    memberConnection,
    {
      body: {
        displayName: updatedDisplayName,
      } satisfies IErpHrmTimeMember.IUpdate,
    },
  );
  typia.assert(persisted);
  TestValidator.equals(
    "shared profile id should stay the same",
    persisted.id,
    initialId,
  );
  TestValidator.equals(
    "shared profile email should stay the same",
    persisted.email,
    initialEmail,
  );
  TestValidator.equals(
    "shared display name should persist",
    persisted.displayName,
    updatedDisplayName,
  );
  TestValidator.equals(
    "shared avatar image url should persist",
    persisted.avatarImageUrl,
    updatedAvatarImageUrl,
  );
  TestValidator.equals(
    "shared phone number should persist",
    persisted.phoneNumber,
    updatedPhoneNumber,
  );
  TestValidator.notEquals(
    "shared profile updatedAt should refresh on subsequent update",
    persisted.updatedAt,
    updated.updatedAt,
  );
  const cleared = await api.functional.erpHrmTime.member.profile.update(
    memberConnection,
    {
      body: {
        avatarImageUrl: null,
        phoneNumber: null,
      } satisfies IErpHrmTimeMember.IUpdate,
    },
  );
  typia.assert(cleared);
  TestValidator.equals(
    "cleared profile id should stay the same",
    cleared.id,
    initialId,
  );
  TestValidator.equals(
    "cleared profile email should stay the same",
    cleared.email,
    initialEmail,
  );
  TestValidator.equals(
    "cleared display name should remain current value",
    cleared.displayName,
    updatedDisplayName,
  );
  TestValidator.equals(
    "avatar image url should be cleared",
    cleared.avatarImageUrl,
    null,
  );
  TestValidator.equals(
    "phone number should be cleared",
    cleared.phoneNumber,
    null,
  );
  TestValidator.equals(
    "createdAt should remain immutable",
    cleared.createdAt,
    initialCreatedAt,
  );
  TestValidator.equals(
    "deletedAt should remain immutable",
    cleared.deletedAt,
    initialDeletedAt,
  );
  TestValidator.notEquals(
    "clearing nullable fields should update updatedAt",
    cleared.updatedAt,
    persisted.updatedAt,
  );
}
