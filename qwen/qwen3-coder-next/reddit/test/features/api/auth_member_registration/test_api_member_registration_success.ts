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
  // Generate valid registration input data
  const joinInput: IRedditLikeMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: null,
    avatar_url: null,
  };
  // Create actor-specific connection for registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Register new member using utility function
  const result: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: joinInput,
    },
  );
  // Validate response structure
  typia.assert(result);
  // Verify key properties
  TestValidator.equals("email matches input", result.email, joinInput.email);
  TestValidator.equals(
    "username matches input",
    result.username,
    joinInput.username,
  );
  TestValidator.equals(
    "display_name matches input",
    result.display_name,
    joinInput.display_name,
  );
  TestValidator.equals("bio matches input", result.bio, joinInput.bio);
  TestValidator.equals(
    "avatar_url matches input",
    result.avatar_url,
    joinInput.avatar_url,
  );
  // Verify authentication token exists
  TestValidator.predicate(
    "token exists",
    result.token.access !== undefined && result.token.refresh !== undefined,
  );
  TestValidator.equals(
    "token expired_at format",
    typeof result.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "token refreshable_until format",
    typeof result.token.refreshable_until,
    "string",
  );
  // Verify karma score initialized to 0
  TestValidator.equals("karma_score initialized to 0", result.karma_score, 0);
  // Verify required UUID fields exist and match format
  TestValidator.predicate(
    "id exists and is valid UUID",
    /^[0-9a-f-]{36}$/i.test(result.id),
  );
  TestValidator.equals(
    "id format matches input email owner",
    typeof result.id,
    "string",
  );
  // Verify timestamp formats
  TestValidator.predicate(
    "created_at is valid ISO string",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      result.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid ISO string",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      result.updated_at,
    ),
  );
  // Verify optional deleted_at field
  TestValidator.predicate(
    "deleted_at is null or undefined",
    result.deleted_at === null || result.deleted_at === undefined,
  );
}
