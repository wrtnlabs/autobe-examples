import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_remove_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member with optional fields set
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      avatar_image: typia.random<string & tags.Format<"uri">>(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(joinResult);
  const originalDisplayName = joinResult.display_name;
  const originalPhoneNumber = joinResult.phone_number;
  const originalAvatarImage = joinResult.avatar_image;
  const originalUpdatedAt = joinResult.updated_at;
  // Verify member was created with optional fields
  TestValidator.equals(
    "avatar_image initially set",
    joinResult.avatar_image,
    originalAvatarImage,
  );
  TestValidator.equals(
    "phone_number initially set",
    joinResult.phone_number,
    originalPhoneNumber,
  );
  // 2. Update profile - remove avatar_image by setting to null
  const updateWithoutAvatar =
    await api.functional.hrmPlatform.member.profile.update(memberConnection, {
      body: {
        avatar_image: null,
      } satisfies IHrmPlatformMember.IUpdate,
    });
  typia.assert(updateWithoutAvatar);
  // 3. Verify avatar_image is null, other fields unchanged
  TestValidator.equals(
    "avatar_image removed",
    updateWithoutAvatar.avatar_image,
    null,
  );
  TestValidator.equals(
    "phone_number unchanged",
    updateWithoutAvatar.phone_number,
    originalPhoneNumber,
  );
  TestValidator.equals(
    "display_name unchanged",
    updateWithoutAvatar.display_name,
    originalDisplayName,
  );
  TestValidator.predicate(
    "updated_at refreshed",
    updateWithoutAvatar.updated_at > originalUpdatedAt,
  );
  // 4. Update profile again - remove phone_number by setting to null
  const updateWithoutPhone =
    await api.functional.hrmPlatform.member.profile.update(memberConnection, {
      body: {
        phone_number: null,
      } satisfies IHrmPlatformMember.IUpdate,
    });
  typia.assert(updateWithoutPhone);
  // 5. Verify both optional fields are null
  TestValidator.equals(
    "avatar_image still null",
    updateWithoutPhone.avatar_image,
    null,
  );
  TestValidator.equals(
    "phone_number removed",
    updateWithoutPhone.phone_number,
    null,
  );
  TestValidator.equals(
    "display_name still unchanged",
    updateWithoutPhone.display_name,
    originalDisplayName,
  );
  TestValidator.predicate(
    "updated_at refreshed again",
    updateWithoutPhone.updated_at > updateWithoutAvatar.updated_at,
  );
}
