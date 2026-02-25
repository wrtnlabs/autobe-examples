import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_profile_update_varied_payloads(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Full update
  const guestJoinConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestJoinConnection, {});
  const guestConnection: api.IConnection = { host: connection.host };
  guestConnection.headers ??= {};
  guestConnection.headers.Authorization = guestAuth.access;
  const fullUpdatePayload: ICommunityPlatformUser.IUpdate = {
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    avatarUrl: `https://example.com/avatar/${RandomGenerator.alphaNumeric(10)}.png`,
  };
  const updatedProfileFull =
    await api.functional.communityPlatform.guest.profile.updateProfile(
      guestConnection,
      { body: fullUpdatePayload },
    );
  typia.assert(updatedProfileFull);
  TestValidator.equals(
    "full update displayName",
    updatedProfileFull.display_name,
    fullUpdatePayload.displayName,
  );
  TestValidator.equals(
    "full update bio",
    updatedProfileFull.bio,
    fullUpdatePayload.bio,
  );
  TestValidator.equals(
    "full update avatarUrl",
    updatedProfileFull.avatar_url,
    fullUpdatePayload.avatarUrl,
  );
  TestValidator.predicate(
    "id and username exist",
    !!updatedProfileFull.id && !!updatedProfileFull.username,
  );
  // Scenario 2: Partial update
  const partialUpdatePayload: ICommunityPlatformUser.IUpdate = {
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const updatedProfilePartialBefore = updatedProfileFull;
  const updatedProfilePartial =
    await api.functional.communityPlatform.guest.profile.updateProfile(
      guestConnection,
      { body: partialUpdatePayload },
    );
  typia.assert(updatedProfilePartial);
  TestValidator.equals(
    "partial update displayName",
    updatedProfilePartial.display_name,
    partialUpdatePayload.displayName,
  );
  TestValidator.equals(
    "partial update bio",
    updatedProfilePartial.bio,
    partialUpdatePayload.bio,
  );
  TestValidator.equals(
    "partial update avatarUrl unchanged",
    updatedProfilePartial.avatar_url,
    updatedProfilePartialBefore.avatar_url,
  );
  // Scenario 3: Empty update
  const emptyUpdatePayload: ICommunityPlatformUser.IUpdate = {};
  const updatedProfileEmpty =
    await api.functional.communityPlatform.guest.profile.updateProfile(
      guestConnection,
      { body: emptyUpdatePayload },
    );
  typia.assert(updatedProfileEmpty);
  TestValidator.equals(
    "empty update unchanged displayName",
    updatedProfileEmpty.display_name,
    updatedProfilePartial.display_name,
  );
  TestValidator.equals(
    "empty update unchanged bio",
    updatedProfileEmpty.bio,
    updatedProfilePartial.bio,
  );
  TestValidator.equals(
    "empty update unchanged avatarUrl",
    updatedProfileEmpty.avatar_url,
    updatedProfilePartial.avatar_url,
  );
}
