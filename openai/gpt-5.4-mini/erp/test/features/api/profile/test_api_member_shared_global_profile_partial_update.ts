import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeGuest";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_member_shared_global_profile_partial_update(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      href: `https://example.com/join/${RandomGenerator.alphaNumeric(12)}`,
      referrer: `https://example.com/ref/${RandomGenerator.alphaNumeric(12)}`,
      email: typia.random<string & tags.Format<"email">>(),
      token: RandomGenerator.alphaNumeric(16),
      invitationCode: RandomGenerator.alphaNumeric(12),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeGuest.IJoin,
  });
  const initialAvatar = `https://example.com/avatar/${RandomGenerator.alphaNumeric(8)}.png`;
  const initialPhone = RandomGenerator.mobile();
  const initialDisplayName = RandomGenerator.name();
  const initial = await api.functional.erpHrmTime.guest.profile.update(
    guestConnection,
    {
      body: {
        displayName: initialDisplayName,
        avatarImageUrl: initialAvatar,
        phoneNumber: initialPhone,
      } satisfies IErpHrmTimeMember.IUpdate,
    },
  );
  typia.assert(initial);
  const updatedDisplayName = RandomGenerator.name();
  const afterDisplayNameOnly =
    await api.functional.erpHrmTime.guest.profile.update(guestConnection, {
      body: {
        displayName: updatedDisplayName,
      } satisfies IErpHrmTimeMember.IUpdate,
    });
  typia.assert(afterDisplayNameOnly);
  TestValidator.equals(
    "displayName should update when provided alone",
    afterDisplayNameOnly.displayName,
    updatedDisplayName,
  );
  TestValidator.equals(
    "avatarImageUrl should remain unchanged when omitted",
    afterDisplayNameOnly.avatarImageUrl,
    initial.avatarImageUrl,
  );
  TestValidator.equals(
    "phoneNumber should remain unchanged when omitted",
    afterDisplayNameOnly.phoneNumber,
    initial.phoneNumber,
  );
  TestValidator.equals(
    "member id should stay the same after partial update",
    afterDisplayNameOnly.id,
    initial.id,
  );
  TestValidator.equals(
    "email should stay the same after partial update",
    afterDisplayNameOnly.email,
    initial.email,
  );
  TestValidator.equals(
    "createdAt should stay the same after partial update",
    afterDisplayNameOnly.createdAt,
    initial.createdAt,
  );
  const updatedAvatar = `https://example.com/avatar/${RandomGenerator.alphaNumeric(10)}.png`;
  const afterAvatarOnly = await api.functional.erpHrmTime.guest.profile.update(
    guestConnection,
    {
      body: {
        avatarImageUrl: updatedAvatar,
      } satisfies IErpHrmTimeMember.IUpdate,
    },
  );
  typia.assert(afterAvatarOnly);
  TestValidator.equals(
    "avatarImageUrl should update when provided alone",
    afterAvatarOnly.avatarImageUrl,
    updatedAvatar,
  );
  TestValidator.equals(
    "displayName should remain unchanged when avatar is updated alone",
    afterAvatarOnly.displayName,
    afterDisplayNameOnly.displayName,
  );
  TestValidator.equals(
    "phoneNumber should remain unchanged when avatar is updated alone",
    afterAvatarOnly.phoneNumber,
    afterDisplayNameOnly.phoneNumber,
  );
  TestValidator.equals(
    "member id should stay the same after avatar update",
    afterAvatarOnly.id,
    initial.id,
  );
  TestValidator.equals(
    "email should stay the same after avatar update",
    afterAvatarOnly.email,
    initial.email,
  );
  TestValidator.equals(
    "createdAt should stay the same after avatar update",
    afterAvatarOnly.createdAt,
    initial.createdAt,
  );
  const updatedPhone = RandomGenerator.mobile();
  const afterPhoneOnly = await api.functional.erpHrmTime.guest.profile.update(
    guestConnection,
    {
      body: {
        phoneNumber: updatedPhone,
      } satisfies IErpHrmTimeMember.IUpdate,
    },
  );
  typia.assert(afterPhoneOnly);
  TestValidator.equals(
    "phoneNumber should update when provided alone",
    afterPhoneOnly.phoneNumber,
    updatedPhone,
  );
  TestValidator.equals(
    "displayName should remain unchanged when phone is updated alone",
    afterPhoneOnly.displayName,
    afterAvatarOnly.displayName,
  );
  TestValidator.equals(
    "avatarImageUrl should remain unchanged when phone is updated alone",
    afterPhoneOnly.avatarImageUrl,
    afterAvatarOnly.avatarImageUrl,
  );
  TestValidator.equals(
    "member id should stay the same after phone update",
    afterPhoneOnly.id,
    initial.id,
  );
  TestValidator.equals(
    "email should stay the same after phone update",
    afterPhoneOnly.email,
    initial.email,
  );
  TestValidator.equals(
    "createdAt should stay the same after phone update",
    afterPhoneOnly.createdAt,
    initial.createdAt,
  );
  const afterAvatarCleared =
    await api.functional.erpHrmTime.guest.profile.update(guestConnection, {
      body: {
        avatarImageUrl: null,
      } satisfies IErpHrmTimeMember.IUpdate,
    });
  typia.assert(afterAvatarCleared);
  TestValidator.equals(
    "avatarImageUrl should clear when null is provided",
    afterAvatarCleared.avatarImageUrl,
    null,
  );
  TestValidator.equals(
    "displayName should be preserved when avatar is cleared",
    afterAvatarCleared.displayName,
    afterPhoneOnly.displayName,
  );
  TestValidator.equals(
    "phoneNumber should be preserved when avatar is cleared",
    afterAvatarCleared.phoneNumber,
    afterPhoneOnly.phoneNumber,
  );
  TestValidator.equals(
    "member id should stay the same after avatar clear",
    afterAvatarCleared.id,
    initial.id,
  );
  TestValidator.equals(
    "email should stay the same after avatar clear",
    afterAvatarCleared.email,
    initial.email,
  );
  TestValidator.equals(
    "createdAt should stay the same after avatar clear",
    afterAvatarCleared.createdAt,
    initial.createdAt,
  );
  const afterPhoneCleared =
    await api.functional.erpHrmTime.guest.profile.update(guestConnection, {
      body: {
        phoneNumber: null,
      } satisfies IErpHrmTimeMember.IUpdate,
    });
  typia.assert(afterPhoneCleared);
  TestValidator.equals(
    "phoneNumber should clear when null is provided",
    afterPhoneCleared.phoneNumber,
    null,
  );
  TestValidator.equals(
    "displayName should be preserved when phone is cleared",
    afterPhoneCleared.displayName,
    afterAvatarCleared.displayName,
  );
  TestValidator.equals(
    "avatarImageUrl should remain cleared when phone is cleared",
    afterPhoneCleared.avatarImageUrl,
    afterAvatarCleared.avatarImageUrl,
  );
  TestValidator.equals(
    "member id should stay the same after phone clear",
    afterPhoneCleared.id,
    initial.id,
  );
  TestValidator.equals(
    "email should stay the same after phone clear",
    afterPhoneCleared.email,
    initial.email,
  );
  TestValidator.equals(
    "createdAt should stay the same across all shared profile updates",
    afterPhoneCleared.createdAt,
    initial.createdAt,
  );
  TestValidator.notEquals(
    "updatedAt should reflect the latest profile change",
    afterPhoneCleared.updatedAt,
    afterAvatarCleared.updatedAt,
  );
}
