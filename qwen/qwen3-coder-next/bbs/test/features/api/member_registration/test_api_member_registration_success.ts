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

export async function test_api_member_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Test successful member registration with full data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  const bio = RandomGenerator.paragraph({ sentences: 2 });
  const registrationData: IDiscussionBoardMember.IJoin = {
    email,
    password,
    display_name: displayName,
    bio,
  };
  const result = await api.functional.discussionBoard.auth.member.join(
    memberConnection,
    {
      body: registrationData,
    },
  );
  typia.assert(result);
  // Validate returned member data
  TestValidator.equals("email matches", result.email, email);
  TestValidator.equals(
    "display_name matches",
    result.display_name,
    displayName,
  );
  TestValidator.predicate("has valid id", /^[0-9a-f-]{36}$/i.test(result.id));
  TestValidator.equals("bio matches", result.bio, bio);
  TestValidator.equals("role is member", result.role, "member");
  TestValidator.equals("is_banned is false", result.is_banned, false);
  TestValidator.equals("ban_reason is null", result.ban_reason, null);
  TestValidator.predicate("has access token", result.token.access.length > 0);
  TestValidator.predicate("has refresh token", result.token.refresh.length > 0);
  TestValidator.predicate(
    "has created_at timestamp",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      result.created_at,
    ),
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      result.updated_at,
    ),
  );
  TestValidator.equals("deleted_at is null", result.deleted_at, null);
  // Test successful registration with minimal required data (no bio)
  const email2 = typia.random<string & tags.Format<"email">>();
  const password2 = RandomGenerator.alphaNumeric(16);
  const displayName2 = RandomGenerator.name();
  const registrationData2: IDiscussionBoardMember.IJoin = {
    email: email2,
    password: password2,
    display_name: displayName2,
  };
  const memberConnection2: api.IConnection = { host: connection.host };
  const result2 = await api.functional.discussionBoard.auth.member.join(
    memberConnection2,
    {
      body: registrationData2,
    },
  );
  typia.assert(result2);
  TestValidator.equals("email matches minimal", result2.email, email2);
  TestValidator.equals(
    "display_name matches minimal",
    result2.display_name,
    displayName2,
  );
  TestValidator.equals("bio is null for minimal", result2.bio, null);
  TestValidator.predicate(
    "has access token minimal",
    result2.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token minimal",
    result2.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has created_at timestamp minimal",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      result2.created_at,
    ),
  );
  TestValidator.predicate(
    "has updated_at timestamp minimal",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      result2.updated_at,
    ),
  );
}
