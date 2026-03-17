import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test profile retrieval when display name has been explicitly set.
 *
 * This test validates the complete workflow:
 * 1. A new member joins the application
 * 2. The member updates their display name with a custom value
 * 3. The member retrieves their profile
 * 4. Verify displayName matches the value that was set
 * 5. Verify updatedAt is more recent than createdAt
 */
export async function test_api_member_profile_display_name_set(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins the application
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Store the createdAt timestamp for comparison
  const createdAt = authorized.createdAt;
  // 2. Member updates their display name with a custom value
  const customDisplayName = RandomGenerator.paragraph({ sentences: 2 });
  const updatedProfile =
    await api.functional.privateTodoApp.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: customDisplayName,
        } satisfies IPrivateTodoAppMember.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 3. Member retrieves their profile
  const profile =
    await api.functional.privateTodoApp.member.profile.at(memberConnection);
  typia.assert(profile);
  // 4. Validate the response contains correct fields
  TestValidator.equals("id matches", profile.id, authorized.id);
  TestValidator.equals("email matches", profile.email, authorized.email);
  TestValidator.equals(
    "displayName matches",
    profile.displayName,
    customDisplayName,
  );
  TestValidator.equals("deletedAt is null", profile.deletedAt, null);
  // 5. Verify updatedAt is more recent than createdAt
  TestValidator.predicate(
    "updatedAt is more recent than createdAt",
    new Date(profile.updatedAt).getTime() > new Date(createdAt).getTime(),
  );
}
