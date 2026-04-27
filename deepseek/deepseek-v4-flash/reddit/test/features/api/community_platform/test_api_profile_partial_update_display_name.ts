import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profile_partial_update_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Set initial profile with all three fields
  const initialProfile =
    await api.functional.communityPlatform.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: "Initial Name",
          biography: "Initial biography text",
          avatar_uri: "https://example.com/initial.png",
        } satisfies ICommunityPlatformProfile.IUpdate,
      },
    );
  typia.assert(initialProfile);
  // 3. Verify initial profile values
  TestValidator.equals(
    "initial display_name",
    initialProfile.display_name,
    "Initial Name",
  );
  TestValidator.equals(
    "initial biography",
    initialProfile.biography,
    "Initial biography text",
  );
  TestValidator.equals(
    "initial avatar_uri",
    initialProfile.avatar_uri,
    "https://example.com/initial.png",
  );
  TestValidator.equals("initial karma", initialProfile.karma, 0);
  const initialUpdatedAt = initialProfile.updated_at;
  // 4. Send partial update with ONLY display_name (omit biography and avatar_uri)
  const updatedProfile =
    await api.functional.communityPlatform.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: "Updated Name",
        } satisfies ICommunityPlatformProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 5. Verify partial update semantics
  TestValidator.equals(
    "updated display_name",
    updatedProfile.display_name,
    "Updated Name",
  );
  TestValidator.equals(
    "biography unchanged",
    updatedProfile.biography,
    "Initial biography text",
  );
  TestValidator.equals(
    "avatar_uri unchanged",
    updatedProfile.avatar_uri,
    "https://example.com/initial.png",
  );
  TestValidator.equals("karma unchanged", updatedProfile.karma, 0);
  TestValidator.predicate(
    "updated_at newer",
    updatedProfile.updated_at > initialUpdatedAt,
  );
}
