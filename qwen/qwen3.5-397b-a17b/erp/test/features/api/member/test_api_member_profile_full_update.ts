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

export async function test_api_member_profile_full_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and join to authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      avatar_url: typia.random<(string & tags.Format<"uri">) | null>(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Store original member data for comparison
  const originalId = authResult.id;
  const originalEmail = authResult.email;
  const originalCreatedAt = authResult.createdAt;
  const originalUpdatedAt = authResult.updatedAt;
  // 3. Generate new values for all updatable profile fields
  const newDisplayName = RandomGenerator.name();
  const newAvatarUrl = typia.random<(string & tags.Format<"uri">) | null>();
  const newPhoneNumber = RandomGenerator.mobile();
  // 4. Update all profile fields in a single request
  const updatedMember = await api.functional.hrmPlatform.members.update(
    memberConnection,
    {
      body: {
        display_name: newDisplayName,
        avatar_url: newAvatarUrl,
        phone_number: newPhoneNumber,
      } satisfies IHrmPlatformMember.IUpdate,
    },
  );
  typia.assert(updatedMember);
  // 5. Verify all updated fields match the input values
  TestValidator.equals(
    "display_name updated",
    updatedMember.displayName,
    newDisplayName,
  );
  TestValidator.equals(
    "avatarUrl updated",
    updatedMember.avatarUrl,
    newAvatarUrl,
  );
  TestValidator.equals(
    "phoneNumber updated",
    updatedMember.phoneNumber,
    newPhoneNumber,
  );
  // 6. Verify updated_at timestamp has changed
  TestValidator.notEquals(
    "updatedAt changed",
    updatedMember.updatedAt,
    originalUpdatedAt,
  );
  TestValidator.predicate(
    "updatedAt is after original",
    () => new Date(updatedMember.updatedAt) > new Date(originalUpdatedAt),
  );
  // 7. Verify unchanged fields remain the same
  TestValidator.equals("id unchanged", updatedMember.id, originalId);
  TestValidator.equals("email unchanged", updatedMember.email, originalEmail);
  TestValidator.equals(
    "createdAt unchanged",
    updatedMember.createdAt,
    originalCreatedAt,
  );
}
