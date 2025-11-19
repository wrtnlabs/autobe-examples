import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_join_duplicate_email_registration(
  connection: api.IConnection,
) {
  // Step 1: Register a new member with random email, password and nickname
  const memberCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "validPassword123",
    nickname: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember = await api.functional.auth.member.join(connection, {
    body: memberCreateBody,
  });
  typia.assert(authorizedMember);

  // Step 2: Attempt duplicate registration with the same email; expect error
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: {
          email: memberCreateBody.email,
          password: "anotherPassword123",
          nickname: RandomGenerator.name(),
        } satisfies IDiscussionBoardMember.ICreate,
      });
    },
  );
}
