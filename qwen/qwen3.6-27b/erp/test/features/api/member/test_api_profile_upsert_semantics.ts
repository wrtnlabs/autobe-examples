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

/**
 * Tests the UPSERT semantics for optional profile fields: null values clear fields while omitted values preserve existing data.
 *
 * Validates the profile update behavior where explicitly provided null values clear the corresponding field, while omitted fields retain their existing values. This ensures that partial updates only modify the fields that are explicitly provided, supporting the UPSERT pattern where null means "clear this field" and omission means "keep existing value".
 *
 * 1. Registers and authenticates as a member via POST /hrmPlatform/auth/member/join
 * 2. Performs first profile update with display_name (new value), avatar_image (URI string), and phone_number (string)
 * 3. Verifies all three fields are set in the response
 * 4. Performs second profile update with only display_name (new value), avatar_image set to null, and phone_number omitted
 * 5. Verifies response shows avatar_image is null (cleared successfully)
 * 6. Verifies response shows phone_number matches the value from step 2 (omitted field preserved)
 * 7. Verifies display_name matches the new value from step 4
 */
export async function test_api_profile_upsert_semantics(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  const initialDisplayName = RandomGenerator.name();
  const initialAvatarImage = typia.random<string & tags.Format<"uri">>();
  const initialPhoneNumber = RandomGenerator.mobile();
  const firstProfile = await api.functional.hrmPlatform.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: initialDisplayName,
        avatar_image: initialAvatarImage,
        phone_number: initialPhoneNumber,
      } satisfies IHrmPlatformMember.IUpdate,
    },
  );
  typia.assert(firstProfile);
  TestValidator.equals(
    "display_name is set",
    firstProfile.display_name,
    initialDisplayName,
  );
  TestValidator.equals(
    "avatar_image is set",
    firstProfile.avatar_image,
    initialAvatarImage,
  );
  TestValidator.equals(
    "phone_number is set",
    firstProfile.phone_number,
    initialPhoneNumber,
  );
  const newDisplayName = RandomGenerator.name();
  const secondProfile = await api.functional.hrmPlatform.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: newDisplayName,
        avatar_image: null,
      } satisfies IHrmPlatformMember.IUpdate,
    },
  );
  typia.assert(secondProfile);
  TestValidator.equals(
    "avatar_image is cleared",
    secondProfile.avatar_image,
    null,
  );
  TestValidator.equals(
    "phone_number is preserved",
    secondProfile.phone_number,
    initialPhoneNumber,
  );
  TestValidator.equals(
    "display_name is updated",
    secondProfile.display_name,
    newDisplayName,
  );
}
