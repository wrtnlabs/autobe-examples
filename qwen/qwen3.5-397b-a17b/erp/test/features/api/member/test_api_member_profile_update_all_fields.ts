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

export async function test_api_member_profile_update_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberAuth = await authorize_member_join(connection, {
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
  typia.assert(memberAuth);
  // 2. Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: `Bearer ${memberAuth.token.access}`,
  };
  // 3. Prepare profile update data with all fields
  const updateData = {
    display_name: RandomGenerator.name(),
    avatar_url: typia.random<(string & tags.Format<"uri">) | null>(),
    phone_number: RandomGenerator.mobile(),
  } satisfies IHrmPlatformMember.IUpdate;
  // 4. Update profile
  const updatedProfile = await api.functional.hrmPlatform.member.profile.update(
    memberConnection,
    {
      body: updateData,
    },
  );
  typia.assert(updatedProfile);
  // 5. Validate updated values match input
  TestValidator.equals(
    "display_name matches",
    updatedProfile.displayName,
    updateData.display_name,
  );
  TestValidator.equals(
    "avatar_url matches",
    updatedProfile.avatarUrl,
    updateData.avatar_url,
  );
  TestValidator.equals(
    "phone_number matches",
    updatedProfile.phoneNumber,
    updateData.phone_number,
  );
  // 6. Validate timestamps
  TestValidator.predicate("updated_at is valid date-time", () => {
    const updatedAt = new Date(updatedProfile.updatedAt);
    const createdAt = new Date(updatedProfile.createdAt);
    return updatedAt >= createdAt;
  });
  // 7. Validate profile structure
  TestValidator.equals(
    "email unchanged",
    updatedProfile.email,
    memberAuth.email,
  );
  TestValidator.equals("id unchanged", updatedProfile.id, memberAuth.id);
}
