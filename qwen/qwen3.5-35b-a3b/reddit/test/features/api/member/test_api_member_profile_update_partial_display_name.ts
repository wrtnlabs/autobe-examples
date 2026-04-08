import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_partial_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member with initial data
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(auth);
  // Store original values for validation
  const originalUsername = auth.username;
  const originalUpdatedAt = auth.updated_at;
  // 2. Update profile with only display_name using authorized connection
  const updateConnection: api.IConnection = { host: connection.host };
  updateConnection.headers = memberConnection.headers;
  const updatedMember =
    await api.functional.redditCommunity.member.profile.update(
      updateConnection,
      {
        body: {
          display_name: RandomGenerator.name(2),
        } satisfies IRedditCommunityMember.IUpdate,
      },
    );
  typia.assert(updatedMember);
  // 3. Validate display_name (username field) changed
  TestValidator.equals(
    "display name updated in response",
    updatedMember.username,
    auth.username,
  );
  TestValidator.notEquals(
    "display name different from original",
    updatedMember.username,
    originalUsername,
  );
  // 4. Validate email unchanged (immutable)
  TestValidator.equals("email unchanged", updatedMember.email, auth.email);
  // 5. Validate updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at timestamp changed",
    originalUpdatedAt,
    updatedMember.updated_at,
  );
  // 6. Validate created_at timestamp unchanged (immutable)
  TestValidator.equals(
    "created_at timestamp unchanged",
    auth.created_at,
    updatedMember.created_at,
  );
  // 7. Validate account still active (deleted_at is null)
  TestValidator.equals("account still active", updatedMember.deleted_at, null);
}
