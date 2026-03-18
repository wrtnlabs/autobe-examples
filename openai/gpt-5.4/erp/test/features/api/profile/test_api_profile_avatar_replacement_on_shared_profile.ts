import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingManagerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManagerSession";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_profile_avatar_replacement_on_shared_profile(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = {
    host: connection.host,
  };
  const authorized = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const initialAvatarImage =
    `https://example.com/avatar/${RandomGenerator.alphaNumeric(12)}.png` satisfies string as string;
  const replacementAvatarImage =
    `https://example.com/avatar/${RandomGenerator.alphaNumeric(12)}.png` satisfies string as string;
  const displayName = RandomGenerator.name();
  const phoneNumber = RandomGenerator.mobile();
  TestValidator.notEquals(
    "replacement avatar uri differs from initial avatar uri",
    initialAvatarImage,
    replacementAvatarImage,
  );
  const firstUpdate = await api.functional.hrmTimeTracking.owner.profile.update(
    ownerConnection,
    {
      body: {
        displayName,
        avatarImage: initialAvatarImage,
        phoneNumber,
      } satisfies IHrmTimeTrackingManagerSession.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  const secondUpdate =
    await api.functional.hrmTimeTracking.owner.profile.update(ownerConnection, {
      body: {
        avatarImage: replacementAvatarImage,
      } satisfies IHrmTimeTrackingManagerSession.IUpdate,
    });
  typia.assert(secondUpdate);
  TestValidator.equals(
    "initial display name is persisted on canonical shared profile",
    firstUpdate.displayName,
    displayName,
  );
  TestValidator.equals(
    "initial phone number is persisted on canonical shared profile",
    firstUpdate.phoneNumber,
    phoneNumber,
  );
  TestValidator.equals(
    "initial avatar is active after first update",
    firstUpdate.avatarImage,
    initialAvatarImage,
  );
  TestValidator.equals(
    "display name remains unchanged after partial avatar replacement",
    secondUpdate.displayName,
    firstUpdate.displayName,
  );
  TestValidator.equals(
    "phone number remains unchanged after partial avatar replacement",
    secondUpdate.phoneNumber,
    firstUpdate.phoneNumber,
  );
  TestValidator.notEquals(
    "avatar image changes after replacement",
    firstUpdate.avatarImage,
    secondUpdate.avatarImage,
  );
  TestValidator.equals(
    "replacement avatar is active in canonical shared profile",
    secondUpdate.avatarImage,
    replacementAvatarImage,
  );
}
