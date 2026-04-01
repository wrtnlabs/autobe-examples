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

export async function test_api_member_profile_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and register new member
  const memberConnection: api.IConnection = { host: connection.host };
  const originalAvatar = typia.random<string & tags.Format<"uri">>();
  const originalPhone = RandomGenerator.mobile();
  const originalDisplayName = RandomGenerator.name();
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: originalDisplayName,
      avatar_image: originalAvatar,
      phone_number: originalPhone,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Store original profile values
  const originalUpdatedAt = authorized.updated_at;
  const originalId = authorized.id;
  const originalEmail = authorized.email;
  // 3. Update only display_name (partial update)
  const newDisplayName = RandomGenerator.name();
  const updateBody = {
    display_name: newDisplayName,
  } satisfies IHrmPlatformMember.IUpdate;
  const updatedProfile = await api.functional.hrmPlatform.member.profile.update(
    memberConnection,
    {
      body: updateBody,
    },
  );
  typia.assert(updatedProfile);
  // 4. Verify display_name is updated
  TestValidator.equals(
    "display_name should be updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.notEquals(
    "display_name should differ from original",
    updatedProfile.display_name,
    originalDisplayName,
  );
  // 5. Verify avatar_image remains unchanged
  TestValidator.equals(
    "avatar_image should remain unchanged",
    updatedProfile.avatar_image,
    originalAvatar,
  );
  // 6. Verify phone_number remains unchanged
  TestValidator.equals(
    "phone_number should remain unchanged",
    updatedProfile.phone_number,
    originalPhone,
  );
  // 7. Verify other fields remain unchanged
  TestValidator.equals(
    "member id should remain unchanged",
    updatedProfile.id,
    originalId,
  );
  TestValidator.equals(
    "email should remain unchanged",
    updatedProfile.email,
    originalEmail,
  );
  // 8. Verify updated_at timestamp is refreshed
  TestValidator.predicate("updated_at should be refreshed", () => {
    const originalTime = new Date(originalUpdatedAt).getTime();
    const updatedTime = new Date(updatedProfile.updated_at).getTime();
    return updatedTime > originalTime;
  });
  TestValidator.notEquals(
    "updated_at should differ from original",
    updatedProfile.updated_at,
    originalUpdatedAt,
  );
}
