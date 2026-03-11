import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_display_name_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member and get authenticated connection
  const joinResult = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Create member-specific connection with auth token
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: joinResult.token.access };
  // Store original values for comparison
  const originalDisplayName = joinResult.display_name;
  const originalBio = joinResult.bio;
  const originalCreatedAt = joinResult.created_at;
  // 3. Update profile with display_name only (bio omitted)
  const newDisplayName = RandomGenerator.name();
  const updateResult =
    await api.functional.discussionBoard.member.profile.update(
      memberConnection,
      {
        body: {
          display_name: newDisplayName,
          // bio intentionally omitted to test it's preserved
        } satisfies IDiscussionBoardMember.IUpdate,
      },
    );
  typia.assert(updateResult);
  // 4. Verify display_name was updated
  TestValidator.equals(
    "display_name updated",
    updateResult.display_name,
    newDisplayName,
  );
  TestValidator.notEquals(
    "display_name changed",
    updateResult.display_name,
    originalDisplayName,
  );
  // 5. Verify bio retained original value
  TestValidator.equals("bio preserved", updateResult.bio, originalBio);
  // 6. Verify updated_at timestamp reflects modification
  TestValidator.predicate("updated_at after created_at", () => {
    const updatedAt = new Date(updateResult.updated_at).getTime();
    const createdAt = new Date(originalCreatedAt).getTime();
    return updatedAt > createdAt;
  });
}
