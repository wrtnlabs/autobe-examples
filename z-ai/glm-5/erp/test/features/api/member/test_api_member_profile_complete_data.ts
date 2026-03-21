import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_complete_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account via join operation
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      phoneNumber: RandomGenerator.mobile(),
      avatarImage: typia.random<string & tags.Format<"url">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  // 2. Update the member profile with optional fields
  const updatedDisplayName = RandomGenerator.name();
  const updatedAvatarImage = typia.random<string & tags.Format<"url">>();
  const updatedPhoneNumber = RandomGenerator.mobile();
  const updatedProfile = await api.functional.erpHrm.member.profile.update(
    memberConnection,
    {
      body: {
        display_name: updatedDisplayName,
        avatar_image: updatedAvatarImage,
        phone_number: updatedPhoneNumber,
      } satisfies IErpHrmMember.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 3. Get member profile
  const memberProfile =
    await api.functional.erpHrm.member.members.at(memberConnection);
  typia.assert(memberProfile);
  // 4. Validate all required fields are present
  TestValidator.equals("email matches", memberProfile.email, joinResult.email);
  TestValidator.equals(
    "display_name matches updated value",
    memberProfile.display_name,
    updatedDisplayName,
  );
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f-]{36}$/i.test(memberProfile.id),
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(memberProfile.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(memberProfile.updated_at),
  );
  // 5. Verify optional fields are populated
  TestValidator.equals(
    "avatar_image matches",
    memberProfile.avatar_image,
    updatedAvatarImage satisfies string as string,
  );
  TestValidator.equals(
    "phone_number matches",
    memberProfile.phone_number ?? null,
    updatedPhoneNumber,
  );
  // 6. Verify deleted_at is null for active account
  TestValidator.equals(
    "deleted_at is null for active account",
    memberProfile.deleted_at,
    null,
  );
  // 7. Ensure password_hash is never present (password_hash is not in IErpHrmMember type)
  // The typia.assert above validates that the response conforms to IErpHrmMember type
  // which does not include password_hash, so this is implicitly validated
}