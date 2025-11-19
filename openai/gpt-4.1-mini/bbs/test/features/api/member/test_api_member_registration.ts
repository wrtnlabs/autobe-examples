import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_member_registration(
  connection: api.IConnection,
) {
  // Step 1: Register new member with valid email, password and nickname
  const memberCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    nickname: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember = await api.functional.auth.member.join(connection, {
    body: memberCreate,
  });

  typia.assert(authorizedMember);
  TestValidator.predicate(
    "member id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      authorizedMember.id,
    ),
  );

  TestValidator.predicate(
    "authorization token has access string",
    typeof authorizedMember.token.access === "string" &&
      authorizedMember.token.access.length > 0,
  );

  TestValidator.predicate(
    "authorization token has refresh string",
    typeof authorizedMember.token.refresh === "string" &&
      authorizedMember.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "authorization token has valid expired_at",
    typeof authorizedMember.token.expired_at === "string" &&
      !isNaN(Date.parse(authorizedMember.token.expired_at)),
  );

  TestValidator.predicate(
    "authorization token has valid refreshable_until",
    typeof authorizedMember.token.refreshable_until === "string" &&
      !isNaN(Date.parse(authorizedMember.token.refreshable_until)),
  );

  // Additional business logic checks could be added here if API supported
}
