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

export async function test_api_member_profile_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member with complete profile information
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAvatarUrl = typia.random<(string & tags.Format<"uri">) | null>();
  const initialPhoneNumber = RandomGenerator.mobile();
  const initialDisplayName = RandomGenerator.name();
  const authorized: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        display_name: initialDisplayName,
        avatar_url: initialAvatarUrl,
        phone_number: initialPhoneNumber,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    });
  typia.assert(authorized);
  // 2. Store initial values for comparison
  const originalAvatarUrl = authorized.avatarUrl;
  const originalPhoneNumber = authorized.phoneNumber;
  const originalUpdatedAt = authorized.updatedAt;
  // 3. Perform partial update with only display_name
  const newDisplayName = RandomGenerator.name();
  const updatedMember: IHrmPlatformMember =
    await api.functional.hrmPlatform.members.update(memberConnection, {
      body: {
        display_name: newDisplayName,
      } satisfies IHrmPlatformMember.IUpdate,
    });
  typia.assert(updatedMember);
  // 4. Validate partial update behavior
  TestValidator.equals(
    "display_name should be updated",
    updatedMember.displayName,
    newDisplayName,
  );
  TestValidator.equals(
    "avatar_url should remain unchanged",
    updatedMember.avatarUrl,
    originalAvatarUrl,
  );
  TestValidator.equals(
    "phone_number should remain unchanged",
    updatedMember.phoneNumber,
    originalPhoneNumber,
  );
  // 5. Verify updatedAt timestamp has been updated
  TestValidator.predicate(
    "updated_at should be later than original",
    new Date(updatedMember.updatedAt).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );
}
