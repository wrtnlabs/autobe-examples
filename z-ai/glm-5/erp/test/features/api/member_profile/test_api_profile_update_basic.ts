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

export async function test_api_profile_update_basic(
  connection: api.IConnection,
): Promise<void> {
  // Test the basic profile update flow where an authenticated member
  // updates their display name, avatar image, and phone number.
  // Steps:
  // 1. Member joins (creates account and first organization)
  // 2. Member updates profile with all fields
  // 3. Verify updated_at is refreshed and fields match provided values
  // 1. Create member connection and authenticate via join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // Store original profile data for comparison
  const originalId = authorized.id;
  const originalEmail = authorized.email;
  const originalCreatedAt = authorized.created_at;
  const originalUpdatedAt = authorized.updated_at;
  // 2. Update profile with all fields
  const updateBody = {
    display_name: RandomGenerator.name(),
    avatar_image: typia.random<string & tags.Format<"url">>(),
    phone_number: RandomGenerator.mobile(),
  } satisfies IErpHrmMember.IUpdate;
  const updatedProfile = await api.functional.erpHrm.member.profile.update(
    memberConnection,
    { body: updateBody },
  );
  typia.assert(updatedProfile);
  // 3. Verify updated_at timestamp is refreshed
  TestValidator.predicate(
    "updated_at should be refreshed",
    updatedProfile.updated_at >= originalUpdatedAt,
  );
  // 4. Verify fields match provided values
  // Widen tagged types to plain strings for comparison
  const expectedAvatarImage = updateBody.avatar_image satisfies
    | string
    | null
    | undefined as string | null | undefined;
  const actualAvatarImage = updatedProfile.avatar_image satisfies
    | string
    | null as string | null;
  TestValidator.equals(
    "display_name matches",
    updatedProfile.display_name,
    updateBody.display_name!,
  );
  TestValidator.equals(
    "avatar_image matches",
    actualAvatarImage ?? null,
    expectedAvatarImage ?? null,
  );
  TestValidator.equals(
    "phone_number matches",
    updatedProfile.phone_number ?? null,
    updateBody.phone_number ?? null,
  );
  // 5. Verify unchanged fields remain the same
  TestValidator.equals("id remains unchanged", updatedProfile.id, originalId);
  TestValidator.equals(
    "email remains unchanged",
    updatedProfile.email,
    originalEmail,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    updatedProfile.created_at,
    originalCreatedAt,
  );
}
