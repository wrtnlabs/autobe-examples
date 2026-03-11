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

/**
 * Test business logic failure when attempting to register with a display name that
 * already exists in the system. First create a member account with a specific
 * display name, then attempt to register another account with the same display name.
 * Verify that the system returns an appropriate error response indicating display
 * name uniqueness violation.
 */
export async function test_api_member_join_duplicate_display_name(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first member with unique display name
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const displayName = RandomGenerator.name(2);
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: displayName,
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(firstMember);
  // Step 2: Attempt to create second member with same display name
  const secondMemberConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("duplicate display name registration", async () => {
    await api.functional.discussionBoard.auth.member.join(
      secondMemberConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          display_name: displayName,
          bio: RandomGenerator.paragraph({ sentences: 2 }),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IDiscussionBoardMember.IJoin,
      },
    );
  });
  // Step 3: Verify business logic error was not a type error
  // (TestValidator.error already ensures error occurs, no need for redundant checks)
}
