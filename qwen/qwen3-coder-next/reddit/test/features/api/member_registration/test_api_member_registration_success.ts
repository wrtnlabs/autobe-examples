import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member registration input with valid data
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatarUrl: RandomGenerator.pick([
      "https://example.com/avatar1.png",
      "https://example.com/avatar2.png",
      null,
    ]),
  } satisfies IRedditLikeMember.IJoin;
  // Call the join endpoint to register a new member
  const output = await api.functional.redditLike.auth.member.join(connection, {
    body: joinInput,
  });
  // Validate the response structure and types
  typia.assert(output);
  // Verify essential fields
  TestValidator.equals("email matches input", output.email, joinInput.email);
  TestValidator.equals(
    "username matches input",
    output.username,
    joinInput.username,
  );
  TestValidator.equals(
    "display name matches input",
    output.display_name,
    joinInput.displayName,
  );
  TestValidator.predicate("karma_score is 0", output.karma_score === 0);
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f-]{36}$/i.test(output.id),
  );
  // Verify token structure
  TestValidator.predicate(
    "has access token",
    typeof output.token.access === "string" && output.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    typeof output.token.refresh === "string" && output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expired_at in ISO format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$/.test(
      output.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "has refreshable_until in ISO format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$/.test(
      output.token.refreshable_until,
    ),
  );
}
