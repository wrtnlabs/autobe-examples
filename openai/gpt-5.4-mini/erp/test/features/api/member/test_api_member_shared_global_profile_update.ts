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

export async function test_api_member_shared_global_profile_update(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      href: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
      referrer: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
      email: typia.random<string & tags.Format<"email">>(),
    } satisfies IErpHrmTimeGuest.IJoin,
  });
  typia.assert(authorized);
  const originalProfile = await api.functional.erpHrmTime.guest.profile.update(
    guestConnection,
    {
      body: {
        displayName: RandomGenerator.name(),
        avatarImageUrl: `https://example.com/${RandomGenerator.alphaNumeric(8)}.png`,
        phoneNumber: RandomGenerator.mobile(),
      } satisfies IErpHrmTimeMember.IUpdate,
    },
  );
  typia.assert(originalProfile);
  const updatedDisplayName = RandomGenerator.name();
  const updatedAvatarImageUrl = `https://example.com/${RandomGenerator.alphaNumeric(8)}.jpg`;
  const updatedPhoneNumber = RandomGenerator.mobile();
  const updatedProfile = await api.functional.erpHrmTime.guest.profile.update(
    guestConnection,
    {
      body: {
        displayName: updatedDisplayName,
        avatarImageUrl: updatedAvatarImageUrl,
        phoneNumber: updatedPhoneNumber,
      } satisfies IErpHrmTimeMember.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  TestValidator.notEquals(
    "member profile should change after shared global profile update",
    originalProfile,
    updatedProfile,
    (key) => key === "updatedAt",
  );
  TestValidator.notEquals(
    "updatedAt should change after profile update",
    originalProfile.updatedAt,
    updatedProfile.updatedAt,
  );
  TestValidator.equals(
    "member id should remain the same",
    updatedProfile.id,
    originalProfile.id,
  );
  TestValidator.equals(
    "login email should remain unchanged",
    updatedProfile.email,
    originalProfile.email,
  );
  TestValidator.equals(
    "display name should update globally",
    updatedProfile.displayName,
    updatedDisplayName,
  );
  TestValidator.equals(
    "avatar image url should update globally",
    updatedProfile.avatarImageUrl,
    updatedAvatarImageUrl,
  );
  TestValidator.equals(
    "phone number should update globally",
    updatedProfile.phoneNumber,
    updatedPhoneNumber,
  );
  TestValidator.equals(
    "member should remain active",
    updatedProfile.deletedAt,
    null,
  );
  const clearedProfile = await api.functional.erpHrmTime.guest.profile.update(
    guestConnection,
    {
      body: {
        avatarImageUrl: null,
        phoneNumber: null,
      } satisfies IErpHrmTimeMember.IUpdate,
    },
  );
  typia.assert(clearedProfile);
  TestValidator.equals(
    "display name should persist when not updated",
    clearedProfile.displayName,
    updatedDisplayName,
  );
  TestValidator.equals(
    "avatar image url should be clearable",
    clearedProfile.avatarImageUrl,
    null,
  );
  TestValidator.equals(
    "phone number should be clearable",
    clearedProfile.phoneNumber,
    null,
  );
  TestValidator.equals(
    "shared profile should remain the same member account",
    clearedProfile.id,
    updatedProfile.id,
  );
  TestValidator.equals(
    "shared profile should keep the same login email",
    clearedProfile.email,
    updatedProfile.email,
  );
  TestValidator.equals(
    "account should remain active after profile update",
    clearedProfile.deletedAt,
    null,
  );
}
